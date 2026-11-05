import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { redis, isCacheEnabled } from "../db/redis.js";

let io = null;

export function initializeSocketIO(server, opts = {}) {
  io = new Server(server, {
    path: "/socket.io",
    cors: { origin: "*" },
    ...opts,
  });

  // If redis is available, plug in adapter for scaling
  if (isCacheEnabled()) {
    try {
      const pubClient = redis.duplicate();
      const subClient = redis.duplicate();
      pubClient.on("error", () => {});
      subClient.on("error", () => {});
      io.adapter(createAdapter(pubClient, subClient));
      console.log("[SocketIO] Redis adapter initialized");
    } catch (err) {
      console.warn("[SocketIO] Redis adapter unavailable, running single-node", err?.message);
    }
  } else {
    console.log("[SocketIO] Redis disabled, running single-node");
  }

  io.use((socket, next) => {
    // Allow connection
    return next();
  });

  io.on("connection", (socket) => {
    console.log(`[SocketIO] client connected: ${socket.id}`);

    // Generic room subscriptions (market.indices, market.gainers, market.losers, market.heatmap, market.option-chain)
    socket.on("SUBSCRIBE_CHANNEL", (payload) => {
      try {
        const { channel } = payload || {};
        if (!channel) return;
        socket.join(channel);
        socket.emit("SUBSCRIBED_CHANNEL", { channel });
        console.log(`[SocketIO] ${socket.id} joined channel ${channel}`);
      } catch (err) {
        console.error("[SocketIO] channel subscribe error", err.message);
      }
    });

    socket.on("UNSUBSCRIBE_CHANNEL", (payload) => {
      try {
        const { channel } = payload || {};
        if (!channel) return;
        socket.leave(channel);
        socket.emit("UNSUBSCRIBED_CHANNEL", { channel });
      } catch (err) {
        console.error("[SocketIO] channel unsubscribe error", err.message);
      }
    });

    // Legacy symbol room subscriptions
    socket.on("SUBSCRIBE_SYMBOL", (payload) => {
      try {
        const { symbol } = payload || {};
        if (!symbol) return;
        const room = `sym:${symbol}`;
        socket.join(room);
        socket.emit("SUBSCRIBED", { symbol });
      } catch (err) {
        console.error("[SocketIO] subscribe error", err.message);
      }
    });

    socket.on("UNSUBSCRIBE_SYMBOL", (payload) => {
      try {
        const { symbol } = payload || {};
        if (!symbol) return;
        const room = `sym:${symbol}`;
        socket.leave(room);
        socket.emit("UNSUBSCRIBED", { symbol });
      } catch (err) {
        console.error("[SocketIO] unsubscribe error", err.message);
      }
    });

    socket.on("heartbeat", () => {
      socket.emit("heartbeat_ack", { ts: Date.now() });
    });

    socket.on("disconnect", (reason) => {
      console.log(`[SocketIO] client disconnected: ${socket.id} (${reason})`);
    });
  });

  console.log("[SocketIO] initialized with Discover market broadcast channels");
}

export function broadcastToChannel(channel, event, payload) {
  if (!io) return;
  io.to(channel).emit(event, payload);
}

export function broadcastToSymbol(symbol, event, payload) {
  if (!io) return;
  const room = `sym:${symbol}`;
  io.to(room).emit(event, payload);
}

export function getSocketStats() {
  if (!io) return { clients: 0 };
  return { clients: io.of('/').sockets.size };
}

export default io;
