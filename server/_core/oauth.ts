import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      console.log("[OAuth] Processing callback with code:", code.substring(0, 10) + "...");
      
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      console.log("[OAuth] Token exchange successful");
      
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      console.log("[OAuth] User info retrieved:", userInfo.openId);

      if (!userInfo.openId) {
        console.error("[OAuth] Missing openId in user info");
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        id: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });
      console.log("[OAuth] User upserted successfully");

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });
      console.log("[OAuth] Session token created");

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      console.log("[OAuth] Login successful, redirecting to home");
      res.redirect(302, "/");
    } catch (error: any) {
      console.error("[OAuth] Callback failed:", error.message);
      console.error("[OAuth] Error details:", error.response?.data || error);
      console.error("[OAuth] Error stack:", error.stack);
      
      // Check if it's an expired/invalid code error
      if (error.response?.status === 401 || error.message?.includes('invalid or expired')) {
        const loginUrl = `/login?error=expired`;
        console.log("[OAuth] Redirecting to login due to expired code");
        res.redirect(302, loginUrl);
        return;
      }
      
      // Return detailed error HTML for debugging
      const errorHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Login Error - Debug Info</title>
  <style>
    body { font-family: monospace; padding: 20px; background: #f5f5f5; }
    .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
    h1 { color: #d32f2f; }
    .section { margin: 20px 0; padding: 15px; background: #f9f9f9; border-left: 4px solid #2196f3; }
    .error { background: #ffebee; border-left-color: #d32f2f; }
    pre { overflow-x: auto; }
    .label { font-weight: bold; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔍 OAuth Login Error - Debug Information</h1>
    
    <div class="section error">
      <div class="label">Error Message:</div>
      <pre>${error.message || 'Unknown error'}</pre>
    </div>
    
    <div class="section">
      <div class="label">DATABASE_URL Status:</div>
      <pre>Exists: ${!!ENV.databaseUrl ? 'YES' : 'NO'}
Length: ${ENV.databaseUrl?.length || 0} characters
First 50 chars: ${ENV.databaseUrl?.substring(0, 50) || 'N/A'}...</pre>
    </div>
    
    <div class="section">
      <div class="label">Environment:</div>
      <pre>NODE_ENV: ${process.env.NODE_ENV || 'not set'}
APP_ID: ${ENV.appId || 'not set'}
OAUTH_SERVER_URL: ${ENV.oAuthServerUrl || 'not set'}</pre>
    </div>
    
    <div class="section error">
      <div class="label">Error Stack:</div>
      <pre>${error.stack || 'No stack trace'}</pre>
    </div>
    
    <div class="section">
      <div class="label">Response Data:</div>
      <pre>${JSON.stringify(error.response?.data, null, 2) || 'No response data'}</pre>
    </div>
    
    <p><a href="/">← Back to Home</a></p>
  </div>
</body>
</html>
      `;
      
      res.status(500).send(errorHtml);
    }
  });
}
