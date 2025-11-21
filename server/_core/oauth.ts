import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
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
      
      // Check if it's an expired/invalid code error
      if (error.response?.status === 401 || error.message?.includes('invalid or expired')) {
        // Redirect to login page with error message
        const loginUrl = `/login?error=expired`;
        console.log("[OAuth] Redirecting to login due to expired code");
        res.redirect(302, loginUrl);
        return;
      }
      
      res.status(500).json({ 
        error: "OAuth callback failed",
        message: error.message,
        details: error.response?.data?.message || "Please try logging in again"
      });
    }
  });
}
