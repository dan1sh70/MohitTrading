import { env } from "../../config/env.js";
import { exchangeAuthCode, getUpstoxTokenStatus } from "../../services/upstox-token-manager.js";

function assertUpstoxConfig() {
  if (!env.upstoxApiKey || !env.upstoxApiSecret) {
    throw new Error("Upstox API is not configured. Set UPSTOX_API_KEY and UPSTOX_API_SECRET in .env.");
  }
}

// Redirect user to Upstox authorization dialog
export function upstoxLogin(req, res) {
  try {
    assertUpstoxConfig();
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }

  const params = new URLSearchParams({
    client_id: env.upstoxApiKey,
    redirect_uri: env.upstoxRedirectUri,
    response_type: 'code'
  });

  const url = `${process.env.UPSTOX_AUTH_URL || 'https://api.upstox.com/v2/login/authorization/dialog'}?${params.toString()}`;
  console.log(`[Upstox Auth] Redirecting user to: ${url}`);
  res.redirect(url);
}

function renderSuccessPage(message) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Upstox Connected</title>
</head>
<body>
  <h3>Upstox Connected Successfully</h3>
  <p>${message}</p>
  <script>
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  </script>
</body>
</html>`;
}

function renderErrorPage(message) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Upstox Connection Failed</title>
</head>
<body>
  <h3>Upstox Connection Failed</h3>
  <p>${message}</p>
</body>
</html>`;
}

// Callback to receive authorization code and exchange for token
export async function upstoxCallback(req, res) {
  try {
    assertUpstoxConfig();

    const { code, error } = req.query;

    if (error) {
      console.error('[Upstox Callback] Error from provider:', error);
      return res.status(400).send(renderErrorPage(`Authorization denied: ${error}`));
    }

    if (!code) {
      const status = await getUpstoxTokenStatus('default');
      if (status.exists && (status.hasAccessToken || status.hasRefreshToken)) {
        return res.redirect('/api/auth/upstox/connected');
      }
      return res.status(400).send(renderErrorPage('Missing authorization code. Please start the Upstox login flow again.'));
    }

    // Exchange code for token and cache it
    await exchangeAuthCode(code, 'default');

    return res.redirect('/api/auth/upstox/connected');
  } catch (err) {
    console.error('[Upstox Callback] Error exchanging code:', err.message);
    res.status(500).send(renderErrorPage(`Failed to exchange authorization code: ${err.message}`));
  }
}

export function upstoxConnected(_req, res) {
  res.send(renderSuccessPage('Upstox is connected. You can now close this window or return to the app.'));
}
