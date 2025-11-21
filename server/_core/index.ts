import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import multer from "multer";
import { storagePut } from "../storage";
import { nanoid } from "nanoid";
import { getSessionCookieOptions } from "./cookies";
import { COOKIE_NAME } from "@shared/const";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // File upload endpoint
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  });

  app.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const fileExtension = req.file.originalname.split(".").pop();
      const fileName = `profile-${nanoid()}.${fileExtension}`;

      const result = await storagePut(
        `profiles/${fileName}`,
        req.file.buffer,
        req.file.mimetype
      );

      res.json({ url: result.url });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  // Logout endpoint
  app.get("/api/auth/logout", (req, res) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    res.redirect("/");
  });

  // Webhook endpoint for Kie.ai callbacks
  app.post("/api/webhook/kie-callback", async (req, res) => {
    try {
      console.log("========== [Webhook] START ==========");
      console.log("[Webhook] Received callback from Kie.ai:", JSON.stringify(req.body, null, 2));
      console.log("[Webhook] Timestamp:", new Date().toISOString());
      
      const callbackData = req.body;
      
      // Validate callback data structure
      if (!callbackData || !callbackData.data || !callbackData.data.taskId) {
        console.error("[Webhook] Invalid callback data structure");
        return res.status(400).json({ error: "Invalid callback data" });
      }

      // Import database functions dynamically to avoid circular dependencies
      const { updateGenerationFromWebhook } = await import("../db");
      
      // Detect webhook format: Veo 3.1 uses 'info' object, others use 'state' and 'resultJson'
      // Both formats may have 'code' field, so we check for 'info' object specifically
      const isVeo31Format = callbackData.data.info !== undefined && callbackData.data.state === undefined;
      
      if (isVeo31Format) {
        // Veo 3.1 webhook format
        const { taskId, info, fallbackFlag } = callbackData.data;
        const code = callbackData.code;
        const msg = callbackData.msg;
        
        console.log(`[Webhook] Processing Veo 3.1 callback for task ${taskId}, code: ${code}`);
        
        if (code === 200) {
          // Success - extract resultUrls from info object
          let resultUrl: string | undefined;
          let resultUrls: string[] = [];
          
          if (info && info.resultUrls && Array.isArray(info.resultUrls)) {
            resultUrls = info.resultUrls;
            resultUrl = resultUrls[0]; // First video for backward compatibility
            
            // Log additional Veo 3.1 specific info
            if (info.originUrls) {
              console.log(`[Webhook] Veo 3.1 originUrls:`, info.originUrls);
            }
            if (info.resolution) {
              console.log(`[Webhook] Veo 3.1 resolution:`, info.resolution);
            }
            if (fallbackFlag) {
              console.log(`[Webhook] Veo 3.1 used fallback model`);
            }
          }
          
          if (resultUrl && resultUrls.length > 0) {
            await updateGenerationFromWebhook(taskId, "completed", resultUrl, resultUrls);
            console.log(`[Webhook] Updated Veo 3.1 task ${taskId} to completed with ${resultUrls.length} result(s)`);
          } else {
            console.error(`[Webhook] No result URL found for successful Veo 3.1 task ${taskId}`);
            await updateGenerationFromWebhook(taskId, "failed", undefined, undefined, "No result URL returned");
          }
        } else {
          // Failed - code is 400, 422, 500, or 501
          const errorMessage = msg || "Veo 3.1 generation failed";
          const fullError = `[Code ${code}] ${errorMessage}`;
          
          await updateGenerationFromWebhook(taskId, "failed", undefined, undefined, fullError);
          console.log(`[Webhook] Updated Veo 3.1 task ${taskId} to failed: ${fullError}`);
        }
      } else {
        // Standard webhook format (for other models)
        const { taskId, state, resultJson, failCode, failMsg } = callbackData.data;
        
        console.log(`[Webhook] Processing standard callback for task ${taskId}, state: ${state}`);
        
        // Update generation in database based on state
        if (state === "success") {
          // Parse resultJson to get result URL(s)
          let resultUrl: string | undefined;
          let resultUrls: string[] = [];
          try {
            const resultData = JSON.parse(resultJson || "{}");
            // Check if resultUrls array exists (batch generation)
            if (resultData.resultUrls && Array.isArray(resultData.resultUrls)) {
              resultUrls = resultData.resultUrls;
              resultUrl = resultUrls[0]; // First image for backward compatibility
            } else if (resultData.resultUrl) {
              // Single result
              resultUrl = resultData.resultUrl;
              resultUrls = resultUrl ? [resultUrl] : [];
            }
          } catch (e) {
            console.error("[Webhook] Failed to parse resultJson:", e);
          }
          
          if (resultUrl && resultUrls.length > 0) {
            await updateGenerationFromWebhook(taskId, "completed", resultUrl, resultUrls);
            console.log(`[Webhook] Updated task ${taskId} to completed with ${resultUrls.length} result(s)`);
          } else {
            console.error(`[Webhook] No result URL found for successful task ${taskId}`);
            await updateGenerationFromWebhook(taskId, "failed", undefined, undefined, "No result URL returned");
          }
        } else if (state === "fail" || state === "failed") {
          const errorMessage = failMsg || "Generation failed";
          const errorCode = failCode || "UNKNOWN_ERROR";
          const fullError = `[${errorCode}] ${errorMessage}`;
          
          await updateGenerationFromWebhook(taskId, "failed", undefined, undefined, fullError);
          console.log(`[Webhook] Updated task ${taskId} to failed: ${fullError}`);
        } else {
          // State is still "waiting" or "processing" - no action needed
          console.log(`[Webhook] Task ${taskId} is still in progress (state: ${state})`);
        }
      }
      
      // Always return 200 to acknowledge receipt
      res.status(200).json({ received: true, taskId: callbackData.data.taskId });
    } catch (error) {
      console.error("[Webhook] Error processing callback:", error);
      // Still return 200 to prevent Kie.ai from retrying
      res.status(200).json({ received: true, error: "Internal processing error" });
    }
  });

  // Webhook endpoint for Omise payment callbacks
  app.post("/api/webhook/omise", async (req, res) => {
    try {
      console.log("[Omise Webhook] Received callback:", JSON.stringify(req.body, null, 2));
      
      const event = req.body;
      
      // Validate event structure
      if (!event || !event.key || !event.data) {
        console.error("[Omise Webhook] Invalid event structure");
        return res.status(400).json({ error: "Invalid event data" });
      }

      // Import services
      const { getCharge } = await import("../omiseService");
      const { getUserCreditTransactions, addCreditsWithTransaction } = await import("../db");
      
      // Handle charge.complete event
      if (event.key === "charge.complete") {
        const chargeId = event.data.id;
        
        // Retrieve full charge details
        const charge = await getCharge(chargeId);
        
        console.log("[Omise Webhook] Charge details:", {
          id: charge.id,
          status: charge.status,
          paid: charge.paid,
          amount: charge.amount,
          metadata: charge.metadata,
        });
        
        // Only process successful payments
        if (charge.paid && charge.status === "successful") {
          const { userId, packageId, credits } = charge.metadata;
          const creditsToAdd = parseInt(credits, 10);
          
          if (!userId || !creditsToAdd) {
            console.error("[Omise Webhook] Missing metadata:", charge.metadata);
            return res.status(400).json({ error: "Missing required metadata" });
          }
          
          // Check if this charge has already been processed (idempotency)
          const transactions = await getUserCreditTransactions(userId);
          const existingTransaction = transactions.find((tx: any) => {
            if (!tx.metadata) return false;
            try {
              const meta = JSON.parse(tx.metadata);
              return meta.chargeId === charge.id;
            } catch {
              return false;
            }
          });
          
          if (existingTransaction) {
            console.log(`[Omise Webhook] ⚠️ Charge ${charge.id} already processed, skipping`);
          } else {
            // Add credits with transaction record (idempotent)
            await addCreditsWithTransaction(
              userId,
              creditsToAdd,
              "topup",
              `เติมเครดิต ${creditsToAdd} เครดิต (${packageId})`,
              {
                chargeId: charge.id,
                packageId,
                amountPaid: charge.amount / 100, // Convert satang to THB
              }
            );
            
            console.log(`[Omise Webhook] ✅ Added ${creditsToAdd} credits to user ${userId}`);
          }
        } else {
          console.log(`[Omise Webhook] ⚠️ Charge not successful: ${charge.status}`);
        }
      }
      
      // Always return 200 to acknowledge receipt
      res.status(200).json({ received: true });
    } catch (error) {
      console.error("[Omise Webhook] Error processing callback:", error);
      // Still return 200 to prevent Omise from retrying
      res.status(200).json({ received: true, error: "Internal processing error" });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
