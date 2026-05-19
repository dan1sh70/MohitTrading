import EventEmitter from "events";
import { env } from "../config/env.js";
import { CacheKey, getJson, setJson, deleteKey } from "../cache/index.js";

const UPSTOX_TOKEN_URL = "https://api.upstox.com/v2/login/authorization/token";
const REFRESH_BUFFER_MS = 5 * 60 * 1000; // refresh 5 minutes before expiry
const MIN_REFRESH_DELAY_MS = 30 * 1000;
const MAX_REFRESH_ATTEMPTS = 3;

const memoryCache = new Map();
const scheduledTimers = new Map();
const refreshInFlight = new Map();
const emitter = new EventEmitter();

function buildTokenPayload(data) {
  const expiresIn = Number(data.expires_in || data.expiresIn || 86400);
  const expiresAt = Date.now() + Math.max(expiresIn * 1000, 60000);

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || data.refreshToken,
    expiresIn,
    expiresAt,
    raw: data
  };
}

async function persistToken(userId, tokenPayload) {
  const key = CacheKey.upstoxToken(userId);
  memoryCache.set(userId, tokenPayload);
  await setJson(key, tokenPayload, Math.max(Math.floor((tokenPayload.expiresAt - Date.now()) / 1000) - 60, 60));
  scheduleRefresh(userId, tokenPayload);
}

function clearScheduledRefresh(userId) {
  const timer = scheduledTimers.get(userId);
  if (timer) {
    clearTimeout(timer);
    scheduledTimers.delete(userId);
  }
}

function scheduleRefresh(userId, tokenPayload) {
  clearScheduledRefresh(userId);

  if (!tokenPayload || !tokenPayload.refreshToken || !tokenPayload.expiresAt) {
    return;
  }

  const delay = Math.max(tokenPayload.expiresAt - Date.now() - REFRESH_BUFFER_MS, MIN_REFRESH_DELAY_MS);
  const timer = setTimeout(async () => {
    try {
      emitter.emit("token.refreshing", { userId });
      await refreshAccessToken(userId);
      emitter.emit("token.refreshed", { userId });
    } catch (error) {
      emitter.emit("token.refresh.failed", { userId, error });
    }
  }, delay);

  scheduledTimers.set(userId, timer);
}

async function readTokenData(userId) {
  if (memoryCache.has(userId)) {
    return memoryCache.get(userId);
  }

  const cached = await getJson(CacheKey.upstoxToken(userId));
  if (!cached) return null;

  memoryCache.set(userId, cached);
  return cached;
}

export async function exchangeAuthCode(code, userId = "default") {
  if (!code) {
    throw new Error("Authorization code is required");
  }

  const response = await fetch(UPSTOX_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: env.upstoxApiKey,
      client_secret: env.upstoxApiSecret,
      code,
      redirect_uri: env.upstoxRedirectUri,
      grant_type: "authorization_code"
    }).toString()
  });

  const data = await response.json();
  if (!response.ok || !data.access_token) {
    const error = data.error_description || data.message || JSON.stringify(data);
    throw new Error(`Upstox auth exchange failed: ${error}`);
  }

  const tokenPayload = buildTokenPayload(data);
  await persistToken(userId, tokenPayload);
  return tokenPayload;
}

export async function refreshAccessToken(userId = "default") {
  const existing = await readTokenData(userId);
  if (!existing || !existing.refreshToken) {
    const error = new Error("No refresh token available for Upstox token refresh");
    error.statusCode = 401;
    throw error;
  }

  if (refreshInFlight.has(userId)) {
    return refreshInFlight.get(userId);
  }

  const refreshPromise = (async () => {
    try {
      const response = await fetch(UPSTOX_TOKEN_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          client_id: env.upstoxApiKey,
          client_secret: env.upstoxApiSecret,
          refresh_token: existing.refreshToken,
          grant_type: "refresh_token"
        }).toString()
      });

      const data = await response.json();
      if (!response.ok || !data.access_token) {
        const error = data.error_description || data.message || JSON.stringify(data);
        const err = new Error(`Upstox refresh failed: ${error}`);
        err.statusCode = response.status || 500;
        throw err;
      }

      const tokenPayload = buildTokenPayload({
        ...data,
        refresh_token: data.refresh_token || existing.refreshToken
      });
      await persistToken(userId, tokenPayload);
      return tokenPayload;
    } finally {
      refreshInFlight.delete(userId);
    }
  })();

  refreshInFlight.set(userId, refreshPromise);
  return refreshPromise;
}

export async function getAccessToken(userId = "default") {
  const tokenData = await readTokenData(userId);
  if (!tokenData) {
    const err = new Error("No Upstox token found. Authorize with /api/auth/upstox/login");
    err.statusCode = 401;
    throw err;
  }

  const now = Date.now();
  if (tokenData.expiresAt - now < REFRESH_BUFFER_MS) {
    const refreshed = await refreshAccessToken(userId);
    return refreshed.accessToken;
  }

  return tokenData.accessToken;
}

export async function fetchWithAuth(url, opts = {}, userId = "default") {
  const token = await getAccessToken(userId);
  const requestOpts = {
    ...opts,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...opts.headers
    }
  };

  let response = await fetch(url, requestOpts);
  if (response.status === 401) {
    await refreshAccessToken(userId);
    const refreshed = await readTokenData(userId);
    const retryOpts = {
      ...opts,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${refreshed.accessToken}`,
        ...opts.headers
      }
    };
    response = await fetch(url, retryOpts);
  }

  if (response.status === 429) {
    emitter.emit("rateLimit.hit", { userId, url });
  }

  return response;
}

export async function getUpstoxTokenStatus(userId = "default") {
  const tokenData = await readTokenData(userId);
  if (!tokenData) {
    return { exists: false, hasRefreshToken: false };
  }

  return {
    exists: true,
    hasAccessToken: Boolean(tokenData.accessToken),
    hasRefreshToken: Boolean(tokenData.refreshToken),
    expiresAt: tokenData.expiresAt,
    expiresInSec: Math.max(0, Math.floor((tokenData.expiresAt - Date.now()) / 1000)),
    scheduledRefresh: scheduledTimers.has(userId)
  };
}

export async function clearUpstoxToken(userId = "default") {
  memoryCache.delete(userId);
  clearScheduledRefresh(userId);
  await deleteKey(CacheKey.upstoxToken(userId));
}

export function onTokenEvent(event, listener) {
  emitter.on(event, listener);
}

export function getTokenEmitter() {
  return emitter;
}
