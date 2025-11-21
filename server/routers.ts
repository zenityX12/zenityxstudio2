import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, adminOrSaleProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { nanoid } from "nanoid";
import * as db from "./db";
import { generateWithKie, checkGenerationStatus, get1080pVideo } from "./kieService";
import { storagePut, storageGet } from "./storage";
import { ENV } from "./_core/env";

// Store active polling intervals for cancellation
const activePollingIntervals = new Map<string, NodeJS.Timeout>();

/**
 * Cancel polling for a specific generation
 * Called when webhook successfully updates the status
 */
export function cancelPolling(generationId: string) {
  const intervalId = activePollingIntervals.get(generationId);
  console.log(`[Poll] cancelPolling called for ${generationId}, intervalId exists: ${!!intervalId}`);
  if (intervalId) {
    clearInterval(intervalId);
    activePollingIntervals.delete(generationId);
    console.log(`[Poll] ✅ Cancelled polling for generation ${generationId}`);
  } else {
    console.log(`[Poll] ⚠️ No active polling found for generation ${generationId}`);
  }
}

// Background polling for generation status (Fallback for webhook)
// Polls every 5 minutes, stops when webhook updates or after 60 minutes max
export async function pollGenerationStatus(
  generationId: string,
  taskId: string,
  modelId: string,
  modelType: "image" | "video"
) {
  try {
    console.log(`[Poll] 🚀 pollGenerationStatus called for ${generationId}`);
    const startTime = Date.now();
    const POLL_INTERVAL = 2 * 60 * 1000; // 2 minutes
    const MAX_DURATION = 45 * 60 * 1000; // 45 minutes
    
    console.log(`[Poll] Starting interval polling for ${generationId} (every 2 min, max 45 min)`);
    
    // Poll immediately after 2 minutes, then every 2 minutes
    const pollInterval = setInterval(async () => {
    try {
      const elapsedTime = Date.now() - startTime;
      
      // Check if max duration exceeded
      if (elapsedTime >= MAX_DURATION) {
        console.log(`[Poll] Max duration (45 min) reached for ${generationId}, stopping polling`);
        clearInterval(pollInterval);
        activePollingIntervals.delete(generationId);
        
        // Check one last time and mark as timeout if still processing
        const generation = await db.getGeneration(generationId);
        if (generation && generation.status === "processing") {
          await db.updateGenerationStatus(
            generationId,
            "failed",
            undefined,
            "Generation timeout after 45 minutes. Please try again or contact support if the issue persists."
          );
          console.log(`[Poll] Generation ${generationId} marked as timeout`);
        }
        return;
      }
      
      // Check if webhook already updated the status
      const generation = await db.getGeneration(generationId);
      
      if (!generation) {
        console.log(`[Poll] Generation ${generationId} not found, stopping polling`);
        clearInterval(pollInterval);
        activePollingIntervals.delete(generationId);
        return;
      }
      
      // If webhook already updated to completed or failed, stop polling
      if (generation.status === "completed" || generation.status === "failed") {
        console.log(`[Poll] Generation ${generationId} already ${generation.status} via webhook, stopping polling`);
        
        // Generate thumbnail if video completed via webhook but doesn't have thumbnail yet
        if (generation.status === "completed" && modelType === "video" && generation.resultUrl && !generation.thumbnailUrl) {
          console.log(`[Auto-Thumbnail] Detected completed video ${generationId} without thumbnail (webhook path), generating...`);
          try {
            const { generateVideoThumbnail } = await import("./thumbnailGenerator");
            await generateVideoThumbnail(generation.resultUrl, generation.userId, generationId);
            console.log(`[Auto-Thumbnail] Successfully generated thumbnail for video ${generationId} (webhook path)`);
          } catch (error) {
            console.error(`[Auto-Thumbnail] Failed to generate thumbnail for video ${generationId} (webhook path):`, error);
          }
        }
        
        clearInterval(pollInterval);
        activePollingIntervals.delete(generationId);
        return;
      }
      
      // Webhook hasn't updated yet, check status from API
      const minutesElapsed = Math.floor(elapsedTime / 60000);
      console.log(`[Poll] Checking status for ${generationId} (${minutesElapsed} min elapsed)...`);
      const status = await checkGenerationStatus(taskId, modelType, modelId);

      if (status.status === "completed") {
        await db.updateGenerationStatus(
          generationId,
          "completed",
          status.resultUrl,
          undefined,
          status.resultUrls // Pass resultUrls array
        );
        console.log(`[Poll] Generation ${generationId} completed with ${status.resultUrls?.length || 1} result(s) (via polling fallback)`);
        
        // Automatic thumbnail generation for completed videos
        console.log(`[Auto-Thumbnail] Checking video ${generationId} (polling): modelType=${modelType}, resultUrl=${status.resultUrl ? 'exists' : 'missing'}`);
        if (modelType === "video" && status.resultUrl) {
          console.log(`[Auto-Thumbnail] Generating thumbnail for video ${generationId} (polling)...`);
          try {
            const generation = await db.getGeneration(generationId);
            if (generation) {
              const { generateVideoThumbnail } = await import("./thumbnailGenerator");
              await generateVideoThumbnail(status.resultUrl, generation.userId, generationId);
              console.log(`[Auto-Thumbnail] Successfully generated thumbnail for video ${generationId}`);
            } else {
              console.error(`[Auto-Thumbnail] Generation ${generationId} not found in database`);
            }
          } catch (error) {
            console.error(`[Auto-Thumbnail] Failed to generate thumbnail for video ${generationId}:`, error);
          }
        } else {
          console.log(`[Auto-Thumbnail] Skipping thumbnail generation for ${generationId} (polling): conditions not met`);
        }
        
        clearInterval(pollInterval);
        activePollingIntervals.delete(generationId);
      } else if (status.status === "failed") {
        await db.updateGenerationStatus(
          generationId,
          "failed",
          undefined,
          status.error || "Generation failed"
        );
        console.log(`[Poll] Generation ${generationId} failed (via polling fallback)`);
        clearInterval(pollInterval);
        activePollingIntervals.delete(generationId);
      } else {
        // Still processing, continue polling
        console.log(`[Poll] Generation ${generationId} still processing, will check again in 2 min`);
      }
    } catch (error) {
      console.error(`[Poll] Error checking status for ${generationId}:`, error);
      // Don't stop polling on error, will retry in next interval
    }
  }, POLL_INTERVAL);
  
    // Store interval ID for cancellation
    activePollingIntervals.set(generationId, pollInterval);
    console.log(`[Poll] ✅ Stored interval ID for ${generationId}, total active polls: ${activePollingIntervals.size}`);
  } catch (error) {
    console.error(`[Poll] ❌ Error in pollGenerationStatus for ${generationId}:`, error);
  }
}

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      // Clear cookie with exact same options used during login
      ctx.res.clearCookie(COOKIE_NAME, cookieOptions);
      return {
        success: true,
      } as const;
    }),
  }),

  // Credits router
  credits: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const credits = await db.getUserCredits(ctx.user.id);
      // Convert DECIMAL (string) to number
      const amount = credits?.amount ? (typeof credits.amount === 'string' ? parseFloat(credits.amount) : Number(credits.amount)) : 0;
      return amount;
    }),
    getBalance: protectedProcedure.query(async ({ ctx }) => {
      const credits = await db.getUserCredits(ctx.user.id);
      // Convert DECIMAL (string) to number
      const amount = credits?.amount ? (typeof credits.amount === 'string' ? parseFloat(credits.amount) : Number(credits.amount)) : 0;
      return amount;
    }),
    listTransactions: protectedProcedure.query(async ({ ctx }) => {
      const transactions = await db.getUserCreditTransactions(ctx.user.id);
      // Join with generations to get status and result URLs
      const transactionsWithDetails = await Promise.all(
        transactions.map(async (transaction) => {
          if (transaction.relatedGenerationId) {
            const generation = await db.getGeneration(transaction.relatedGenerationId);
            return {
              ...transaction,
              generationStatus: generation?.status,
              resultUrls: generation?.resultUrls || generation?.resultUrl,
              refunded: generation?.refunded || false,
            };
          }
          return {
            ...transaction,
            generationStatus: undefined,
            resultUrls: undefined,
            refunded: false,
          };
        })
      );
      return transactionsWithDetails;
    }),
    refund: protectedProcedure
      .input(z.object({
        generationId: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.refundGeneration(input.generationId);
        if (!result.success) {
          throw new Error(result.message);
        }
        return { success: true };
      }),
  }),

  // Profile router
  profile: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserById(ctx.user.id);
    }),
    update: protectedProcedure
      .input(z.object({
        name: z.string().optional(),
        username: z.string().min(3).max(64).optional(),
        bio: z.string().max(500).optional(),
        phone: z.string().max(20).optional(),
        birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        profilePicture: z.string().optional(),
        preferences: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check username uniqueness if provided
        if (input.username) {
          const existing = await db.getUserByUsername(input.username);
          if (existing && existing.id !== ctx.user.id) {
            throw new Error("Username already taken");
          }
        }
        await db.updateUserProfile(ctx.user.id, input);
        return { success: true };
      }),
    checkUsername: protectedProcedure
      .input(z.object({ username: z.string() }))
      .query(async ({ input }) => {
        const existing = await db.getUserByUsername(input.username);
        return { available: !existing };
      }),
  }),

  // AI Models router
  models: router({
    list: publicProcedure.query(async () => {
      return await db.getAllAIModels();
    }),
  }),

  // Generations router
  generations: router({
    create: protectedProcedure
      .input(z.object({
        modelId: z.string(),
        prompt: z.string().optional(), // Optional for Storyboard (uses shots instead)
        // Image generation options (Seedream V4, Google Nano Banana)
        aspectRatio: z.string().optional(), // For both image and video
        imageUrl: z.string().optional(), // For Seedream V4 Edit and Character Remix
        imageResolution: z.enum(["1K", "2K", "4K"]).optional(), // For Seedream V4 resolution
        // Nano Banana options
        outputFormat: z.enum(["png", "jpeg"]).optional(),
        // Seedream V4 batch options
        maxImages: z.number().min(1).max(6).optional(),
        // Ideogram Character Remix/Character options
        referenceImageUrls: z.array(z.string()).optional(),
        renderingSpeed: z.enum(["TURBO", "BALANCED", "QUALITY"]).optional(),
        style: z.enum(["AUTO", "REALISTIC", "FICTION"]).optional(),
        expandPrompt: z.boolean().optional(),
        numImages: z.enum(["1", "2", "3", "4"]).optional(),
        strength: z.number().min(0.1).max(1.0).optional(),
        negativePrompt: z.string().optional(),
        styleImageUrls: z.array(z.string()).optional(),
        referenceMaskUrls: z.string().optional(),
        // Veo 3.1 advanced options
        imageUrls: z.array(z.string()).optional(),
        generationType: z.enum(["TEXT_2_VIDEO", "FIRST_AND_LAST_FRAMES_2_VIDEO", "REFERENCE_2_VIDEO"]).optional(),
        firstFrameUrl: z.string().optional(), // For FIRST_AND_LAST_FRAMES_2_VIDEO
        lastFrameUrl: z.string().optional(),  // For FIRST_AND_LAST_FRAMES_2_VIDEO
        seeds: z.number().min(10000).max(99999).optional(),
        watermark: z.string().optional(),
        enableTranslation: z.boolean().optional(),
        // SORA 2 options
        nFrames: z.enum(["10", "15", "25"]).optional(),
        removeWatermark: z.boolean().optional(),
        size: z.enum(["standard", "high"]).optional(),
        shots: z.array(z.object({ Scene: z.string(), duration: z.number() })).optional(), // For Sora 2 Pro Storyboard
        // Seedance options
        endImageUrl: z.string().optional(),
        resolution: z.enum(["480p", "720p", "1080p"]).optional(),
        duration: z.enum(["5", "10"]).optional(),
        cameraFixed: z.boolean().optional(),
        seed: z.number().optional(),
        enableSafetyChecker: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const model = await db.getAIModel(input.modelId);
        if (!model) throw new Error("Model not found");

        // Calculate actual cost based on model parameters
        // Use costPerGeneration set by admin as base price
        // Convert to number to handle decimal properly
        let actualCost = Number(model.costPerGeneration);
        
        // For Ideogram models: get price from pricingOptions based on rendering_speed, then multiply by num_images
        if (model.modelId.startsWith('ideogram/')) {
          let baseCost = Number(model.costPerGeneration);
          
          // Get cost from pricingOptions based on rendering_speed
          if (input.renderingSpeed && model.pricingOptions) {
            try {
              const pricingOptions = JSON.parse(model.pricingOptions);
              if (pricingOptions[input.renderingSpeed]) {
                baseCost = pricingOptions[input.renderingSpeed];
              }
            } catch (e) {
              console.error('[Pricing] Failed to parse pricingOptions:', e);
            }
          }
          
          const numImages = parseInt(input.numImages || '1');
          actualCost = baseCost * numImages;
        }
        
        // For Seedream V4: multiply by max_images
        if (model.modelId.startsWith('bytedance/seedream-v4')) {
          const maxImages = input.maxImages || 1;
          actualCost = Number(model.costPerGeneration) * maxImages;
        }
        
        // For Seedance (bytedance/v1-*): use pricingOptions based on resolution and duration
        if (model.modelId.startsWith('bytedance/v1-')) {
          if (model.pricingOptions && input.resolution && input.duration) {
            try {
              const pricingOptions = JSON.parse(model.pricingOptions);
              const key = `${input.resolution}-${input.duration}s`;
              if (pricingOptions[key]) {
                actualCost = pricingOptions[key];
              } else {
                console.error(`[Pricing] No price found for Seedance key: ${key}`);
              }
            } catch (e) {
              console.error('[Pricing] Failed to parse Seedance pricingOptions:', e);
            }
          }
        }
        
        // For Kling 2.1: use pricingOptions based on duration
        if (model.modelId.startsWith('kling/')) {
          if (model.pricingOptions && input.duration) {
            try {
              const pricingOptions = JSON.parse(model.pricingOptions);
              const key = `${input.duration}s`;
              
              if (pricingOptions[key]) {
                actualCost = pricingOptions[key];
                console.log(`[Pricing] Kling ${model.name}: ${key} = ${actualCost} credits`);
              } else {
                console.error(`[Pricing] No price found for Kling key: ${key}`);
              }
            } catch (e) {
              console.error('[Pricing] Failed to parse Kling pricingOptions:', e);
            }
          } else {
            console.error(`[Pricing] Kling missing duration: ${input.duration}`);
          }
        }
        
        // For Sora 2: use pricingOptions based on nFrames (and size for Pro models)
        if (model.modelId.startsWith('sora-2')) {
          if (model.pricingOptions && input.nFrames) {
            try {
              const pricingOptions = JSON.parse(model.pricingOptions);
              let key: string;
              
              // Check if it's a Pro model or Storyboard (uses duration-only keys)
              const isStoryboard = model.modelId.includes('storyboard');
              const isProModel = model.modelId.includes('-pro');
              
              if (isStoryboard || !isProModel) {
                // Storyboard and non-Pro models: use duration-only key
                key = `${input.nFrames}s`;
              } else {
                // Pro models: use quality-based key
                const size = input.size || 'standard';
                key = `${input.nFrames}s-${size}`;
              }
              
              if (pricingOptions[key]) {
                actualCost = pricingOptions[key];
                console.log(`[Pricing] Sora 2 ${model.name}: ${key} = ${actualCost} credits`);
              } else {
                console.error(`[Pricing] No price found for Sora 2 key: ${key}`);
              }
            } catch (e) {
              console.error('[Pricing] Failed to parse Sora 2 pricingOptions:', e);
            }
          } else {
            console.error(`[Pricing] Sora 2 missing nFrames: ${input.nFrames}`);
          }
        }

        // Calculate Kie Credits (same logic as actualCost but using kiePrice/kiePricingOptions)
        let kieCreditsUsed = Number(model.kiePrice || 0);
        
        // For Ideogram models: get price from kiePricingOptions based on rendering_speed, then multiply by num_images
        if (model.modelId.startsWith('ideogram/')) {
          let baseCost = Number(model.kiePrice || 0);
          
          // Get cost from kiePricingOptions based on rendering_speed
          if (input.renderingSpeed && model.kiePricingOptions) {
            try {
              const kiePricingOptions = JSON.parse(model.kiePricingOptions);
              if (kiePricingOptions[input.renderingSpeed]) {
                baseCost = kiePricingOptions[input.renderingSpeed];
              }
            } catch (e) {
              console.error('[Kie Pricing] Failed to parse kiePricingOptions:', e);
            }
          }
          
          const numImages = parseInt(input.numImages || '1');
          kieCreditsUsed = baseCost * numImages;
        }
        
        // For Seedream V4: multiply by max_images
        if (model.modelId.startsWith('bytedance/seedream-v4')) {
          const maxImages = input.maxImages || 1;
          kieCreditsUsed = Number(model.kiePrice || 0) * maxImages;
        }
        
        // For Seedance (bytedance/v1-*): use kiePricingOptions based on resolution and duration
        if (model.modelId.startsWith('bytedance/v1-')) {
          if (model.kiePricingOptions && input.resolution && input.duration) {
            try {
              const kiePricingOptions = JSON.parse(model.kiePricingOptions);
              const key = `${input.resolution}-${input.duration}s`;
              if (kiePricingOptions[key]) {
                kieCreditsUsed = kiePricingOptions[key];
              } else {
                console.error(`[Kie Pricing] No price found for Seedance key: ${key}`);
              }
            } catch (e) {
              console.error('[Kie Pricing] Failed to parse Seedance kiePricingOptions:', e);
            }
          }
        }
        
        // For Kling models: use kiePricingOptions based on duration
        if (model.modelId.startsWith('kling/')) {
          if (model.kiePricingOptions && input.duration) {
            try {
              const kiePricingOptions = JSON.parse(model.kiePricingOptions);
              const key = `${input.duration}s`;
              if (kiePricingOptions[key]) {
                kieCreditsUsed = kiePricingOptions[key];
                console.log(`[Kie Pricing] Kling ${model.name}: ${key} = ${kieCreditsUsed} credits`);
              } else {
                console.error(`[Kie Pricing] No price found for Kling key: ${key}`);
              }
            } catch (e) {
              console.error('[Kie Pricing] Failed to parse Kling kiePricingOptions:', e);
            }
          }
        }
        
        // For Sora 2: use kiePricingOptions based on nFrames (and size for Pro models)
        if (model.modelId.startsWith('sora-2')) {
          if (model.kiePricingOptions && input.nFrames) {
            try {
              const kiePricingOptions = JSON.parse(model.kiePricingOptions);
              let key: string;
              
              // Check if it's a Pro model or Storyboard (uses duration-only keys)
              const isStoryboard = model.modelId.includes('storyboard');
              const isProModel = model.modelId.includes('-pro');
              
              if (isStoryboard || !isProModel) {
                // Storyboard and non-Pro models: use duration-only key
                key = `${input.nFrames}s`;
              } else {
                // Pro models: use quality-based key
                const size = input.size || 'standard';
                key = `${input.nFrames}s-${size}`;
              }
              
              if (kiePricingOptions[key]) {
                kieCreditsUsed = kiePricingOptions[key];
                console.log(`[Kie Pricing] Sora 2 ${model.name}: ${key} = ${kieCreditsUsed} credits`);
              } else {
                console.error(`[Kie Pricing] No price found for Sora 2 key: ${key}`);
              }
            } catch (e) {
              console.error('[Kie Pricing] Failed to parse Sora 2 kiePricingOptions:', e);
            }
          } else {
            console.error(`[Kie Pricing] Sora 2 missing nFrames: ${input.nFrames}`);
          }
        }

        const userCredits = await db.getUserCredits(ctx.user.id);
        if (!userCredits || Number(userCredits.amount) < actualCost) {
          throw new Error("Insufficient credits");
        }

        const generationId = `gen_${nanoid()}`;
        
        // Store generation parameters for later retrieval
        const parameters = {
          aspectRatio: input.aspectRatio,
          imageUrl: input.imageUrl,
          imageResolution: input.imageResolution,
          outputFormat: input.outputFormat,
          maxImages: input.maxImages,
          referenceImageUrls: input.referenceImageUrls,
          renderingSpeed: input.renderingSpeed,
          style: input.style,
          expandPrompt: input.expandPrompt,
          numImages: input.numImages,
          strength: input.strength,
          negativePrompt: input.negativePrompt,
          styleImageUrls: input.styleImageUrls,
          referenceMaskUrls: input.referenceMaskUrls,
          imageUrls: input.imageUrls,
          generationType: input.generationType,
          firstFrameUrl: input.firstFrameUrl,
          lastFrameUrl: input.lastFrameUrl,
          seeds: input.seeds,
          watermark: input.watermark,
          enableTranslation: input.enableTranslation,
          nFrames: input.nFrames,
          removeWatermark: input.removeWatermark,
          size: input.size,
          shots: input.shots,
          endImageUrl: input.endImageUrl,
          resolution: input.resolution,
          duration: input.duration,
          cameraFixed: input.cameraFixed,
          seed: input.seed,
          enableSafetyChecker: input.enableSafetyChecker,
        };
        
        // Deduct credits first
        const modelName = model.name;
        const promptPreview = (input.prompt || "Storyboard Generation").substring(0, 100);
        await db.deductCreditsWithTransaction(
          ctx.user.id,
          actualCost,
          `${modelName}: ${promptPreview}${(input.prompt || "").length > 100 ? '...' : ''}`,
          generationId
        );

        // Start generation process and get taskId first
        try {
          const result = await generateWithKie({
            model: model.modelId,
            prompt: input.prompt || "", // Empty prompt for Storyboard (uses shots instead)
            type: model.type,
            aspectRatio: input.aspectRatio,
            imageUrls: input.imageUrls,
            imageUrl: input.imageUrl,
            imageResolution: input.imageResolution,
            outputFormat: input.outputFormat,
            maxImages: input.maxImages,
            referenceImageUrls: input.referenceImageUrls,
            renderingSpeed: input.renderingSpeed,
            style: input.style,
            expandPrompt: input.expandPrompt,
            numImages: input.numImages,
            strength: input.strength,
            negativePrompt: input.negativePrompt,
            styleImageUrls: input.styleImageUrls,
            referenceMaskUrls: input.referenceMaskUrls,
            endImageUrl: input.endImageUrl,
            generationType: input.generationType,
            firstFrameUrl: input.firstFrameUrl,
            lastFrameUrl: input.lastFrameUrl,
            seeds: input.seeds,
            watermark: input.watermark,
            enableTranslation: input.enableTranslation,
            nFrames: input.nFrames,
            removeWatermark: input.removeWatermark,
            size: input.size,
            shots: input.shots,
            resolution: input.resolution,
            duration: input.duration,
            cameraFixed: input.cameraFixed,
            seed: input.seed,
            enableSafetyChecker: input.enableSafetyChecker,
          });
          
          // Create generation with taskId from the start
          await db.createGeneration({
            id: generationId,
            userId: ctx.user.id,
            modelId: input.modelId,
            type: model.type,
            prompt: input.prompt || "Storyboard Generation",
            status: "processing",
            taskId: result.id,
            creditsUsed: String(actualCost),
            kieCreditsUsed: String(kieCreditsUsed),
            parameters: JSON.stringify(parameters),
          });
          
          // Start polling for status in background (as fallback to webhook)
          pollGenerationStatus(generationId, result.id, model.modelId, model.type);
        } catch (error: any) {
          // If Kie API fails, create generation with failed status
          await db.createGeneration({
            id: generationId,
            userId: ctx.user.id,
            modelId: input.modelId,
            type: model.type,
            prompt: input.prompt || "Storyboard Generation",
            status: "failed",
            creditsUsed: String(actualCost),
            kieCreditsUsed: String(kieCreditsUsed),
            errorMessage: error.message,
            parameters: JSON.stringify(parameters),
          });
          
          // Refund credits since generation failed
          await db.refundGeneration(generationId);
        }

        return { id: generationId };
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserGenerations(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        return await db.getGeneration(input.id);
      }),

    // Soft delete - hide from Studio/Gallery but keep in History
    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const generation = await db.getGeneration(input.id);
        if (!generation) throw new Error("Generation not found");
        if (generation.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new Error("Unauthorized");
        }
        await db.hideGeneration(input.id);
        return { success: true };
      }),

    // Unhide generation
    unhide: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const generation = await db.getGeneration(input.id);
        if (!generation) throw new Error("Generation not found");
        if (generation.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new Error("Unauthorized");
        }
        await db.unhideGeneration(input.id);
        return { success: true };
      }),

    get1080p: protectedProcedure
      .input(z.object({ taskId: z.string() }))
      .mutation(async ({ input }) => {
        try {
          const result = await get1080pVideo(input.taskId);
          return { url: result.url };
        } catch (error: any) {
          throw new Error(error.message || "Failed to get 1080p video");
        }
      }),
  }),

  // Admin router
  admin: router({
    // Mobile Admin Stats
    getStats: adminProcedure.query(async () => {
      const [overview, aiUsage, users, allGenerations] = await Promise.all([
        db.getDashboardOverview(),
        db.getAIUsageStats(),
        db.getAllUsers(),
        db.getAllGenerations(),
      ]);
      return {
        totalUsers: users.length,
        totalGenerations: allGenerations.length,
        totalRevenue: overview?.totalCreditsSold || 0,
        totalCreditsUsed: overview?.totalCreditsUsed || 0,
        activeToday: aiUsage?.activeUsersToday || 0,
      };
    }),

    // Dashboard
    dashboard: router({
      overview: adminProcedure.query(async () => {
        return await db.getDashboardOverview();
      }),
      aiUsage: adminProcedure.query(async () => {
        return await db.getAIUsageStats();
      }),
      resources: adminProcedure.query(async () => {
        return await db.getResourceStats();
      }),
    }),

    // Sales
    sales: router({
      statistics: adminProcedure
        .input(z.object({
          period: z.enum(['today', 'week', 'month', 'all']).default('all'),
        }))
        .query(async ({ input }) => {
          return await db.getSalesStatistics(input.period);
        }),

      transactions: adminProcedure
        .input(z.object({
          period: z.enum(['today', 'week', 'month', 'all']).default('all'),
          search: z.string().optional(),
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        }))
        .query(async ({ input }) => {
          return await db.getSalesTransactions({
            period: input.period,
            search: input.search,
            limit: input.limit,
            offset: input.offset,
          });
        }),
    }),

    // Invite codes
    inviteCodes: router({
      list: adminOrSaleProcedure.query(async () => {
        const codes = await db.getAllInviteCodes();
        // Get redemption info for each code
        const codesWithRedemptions = await Promise.all(
          codes.map(async (code) => {
            const redemptions = await db.getInviteCodeRedemptions(code.id);
            return {
              ...code,
              redemptions: redemptions.map(r => ({
                userId: r.userId,
                userName: r.userName,
                userEmail: r.userEmail,
                redeemedAt: r.createdAt,
              })),
            };
          })
        );
        return codesWithRedemptions;
      }),

      create: adminOrSaleProcedure
        .input(z.object({
          credits: z.number().min(0),
          maxUses: z.number().min(1),
          quantity: z.number().min(1).max(100).default(1), // Batch creation (max 100)
          note: z.string().optional(), // Optional note
          expiresAt: z.date().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          const { logActivity } = await import("./activityLog");
          const codes: string[] = [];
          const codeIds: string[] = [];
          
          // Create multiple codes if quantity > 1
          for (let i = 0; i < input.quantity; i++) {
            const code = nanoid(10).toUpperCase();
            const codeId = `invite_${nanoid()}`;
            await db.createInviteCode({
              id: codeId,
              code,
              credits: input.credits,
              maxUses: input.maxUses,
              usedCount: 0,
              isActive: 1 as any,
              note: input.note,
              createdBy: ctx.user.id,
              expiresAt: input.expiresAt,
            });
            codes.push(code);
            codeIds.push(codeId);
          }
          
          // Log activity
          await logActivity({
            userId: ctx.user.id,
            userRole: ctx.user.role as "admin" | "sale",
            action: "create_invite_code",
            targetType: "invite_code",
            details: { quantity: input.quantity, credits: input.credits, codes },
          });
          
          return { codes, quantity: input.quantity };
        }),

      toggleStatus: adminOrSaleProcedure
        .input(z.object({
          id: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
          const { logActivity } = await import("./activityLog");
          await db.toggleInviteCodeStatus(input.id);
          
          // Log activity
          await logActivity({
            userId: ctx.user.id,
            userRole: ctx.user.role as "admin" | "sale",
            action: "toggle_invite_status",
            targetType: "invite_code",
            targetId: input.id,
          });
          
          return { success: true };
        }),

      delete: adminProcedure
        .input(z.object({
          id: z.string(),
        }))
        .mutation(async ({ input }) => {
          await db.deleteInviteCode(input.id);
          return { success: true };
        }),
    }),

    // API Keys
    apiKeys: router({
      list: adminProcedure.query(async () => {
        return await db.getAllAPIKeys();
      }),

      create: adminProcedure
        .input(z.object({
          name: z.string(),
          apiKey: z.string(),
          monthlyBudget: z.number().min(0),
        }))
        .mutation(async ({ input }) => {
          await db.createAPIKey({
            id: `key_${nanoid()}`,
            name: input.name,
            apiKey: input.apiKey,
            isActive: 1 as any,
            monthlyBudget: input.monthlyBudget,
            currentSpend: 0,
          });
          return { success: true };
        }),
    }),

    // AI Models management
    models: router({
      list: adminProcedure.query(async () => {
        return await db.getAllAIModelsForAdmin();
      }),

      updatePrice: adminProcedure
        .input(z.object({
          id: z.string(),
          costPerGeneration: z.number().min(0),
          kiePrice: z.number().min(0).optional(),
          pricingOptions: z.string().optional(),
          kiePricingOptions: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          await db.updateAIModelPrice(input.id, input.costPerGeneration, input.pricingOptions, input.kiePrice, input.kiePricingOptions);
          return { success: true };
        }),

      toggleStatus: adminProcedure
        .input(z.object({
          id: z.string(),
          isActive: z.boolean(),
        }))
        .mutation(async ({ input }) => {
          await db.toggleAIModelStatus(input.id, input.isActive);
          return { success: true };
        }),
    }),

    // Users management
    users: router({
      list: adminProcedure.query(async () => {
        const users = await db.getAllUsers();
        const usersWithCredits = await Promise.all(
          users.map(async (user) => {
            const credits = await db.getUserCredits(user.id);
            const stats = await db.getUserCreditStats(user.id);
            return {
              ...user,
              credits: credits?.amount || 0,
              creditsAdded: stats.creditsAdded,
              creditsUsed: stats.creditsUsed,
            };
          })
        );
        return usersWithCredits;
      }),

      addCredits: adminProcedure
        .input(z.object({
          userId: z.string(),
          amount: z.number().min(1),
        }))
        .mutation(async ({ input }) => {
          await db.addCreditsToUser(input.userId, input.amount);
          return { success: true };
        }),

      setCredits: adminProcedure
        .input(z.object({
          userId: z.string(),
          amount: z.number().min(0),
        }))
        .mutation(async ({ input }) => {
          await db.setUserCredits(input.userId, input.amount);
          return { success: true };
        }),
      
      getTransactions: adminProcedure
        .input(z.object({
          userId: z.string(),
        }))
        .query(async ({ input }) => {
          const transactions = await db.getUserCreditTransactions(input.userId);
          // Join with generations to get status and result URLs
          const transactionsWithDetails = await Promise.all(
            transactions.map(async (transaction) => {
              if (transaction.relatedGenerationId) {
                const generation = await db.getGeneration(transaction.relatedGenerationId);
                return {
                  ...transaction,
                  generation: generation ? {
                    status: generation.status,
                    resultUrl: generation.resultUrl,
                    resultUrls: generation.resultUrls,
                  } : null,
                };
              }
              return transaction;
            })
          );
          return transactionsWithDetails;
        }),

      toggleVerified: adminProcedure
        .input(z.object({
          userId: z.string(),
          isVerified: z.boolean(),
        }))
        .mutation(async ({ input }) => {
          await db.updateUserVerificationStatus(input.userId, input.isVerified);
          return { success: true };
        }),

      updateRole: adminProcedure
        .input(z.object({
          userId: z.string(),
          role: z.enum(["user", "admin", "sale"]),
        }))
        .mutation(async ({ ctx, input }) => {
          const { logActivity } = await import("./activityLog");
          await db.updateUserRole(input.userId, input.role);
          
          // Log the role change
          await logActivity({
            userId: ctx.user.id,
            userRole: "admin",
            action: "update_user_role",
            targetType: "user",
            targetId: input.userId,
            details: { newRole: input.role },
          });
          
          return { success: true };
        }),
    }),

    // Activity Logs
    activityLogs: router({
      list: adminProcedure.query(async () => {
        const { getRecentActivityLogs } = await import("./activityLog");
        return await getRecentActivityLogs();
      }),
    }),

    // Verified Codes Management
    verifiedCodes: router({
      list: adminOrSaleProcedure.query(async () => {
        const { listVerifiedCodes } = await import("./verifiedCodeService");
        return await listVerifiedCodes();
      }),

      create: adminOrSaleProcedure
        .input(z.object({
          quantity: z.number().min(1).max(100).default(1),
          maxUses: z.number().min(1).default(1),
          expiresAt: z.date().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          const { createVerifiedCode } = await import("./verifiedCodeService");
          const { logActivity } = await import("./activityLog");
          const codes: string[] = [];
          
          // Create multiple codes if quantity > 1
          for (let i = 0; i < input.quantity; i++) {
            const code = nanoid(10).toUpperCase();
            await createVerifiedCode({
              code,
              maxUses: input.maxUses,
              expiresAt: input.expiresAt ?? null,
              createdBy: ctx.user.id,
            });
            codes.push(code);
          }
          
          // Log activity
          await logActivity({
            userId: ctx.user.id,
            userRole: ctx.user.role as "admin" | "sale",
            action: "create_verified_code",
            targetType: "verified_code",
            details: { quantity: input.quantity, codes },
          });
          
          return { codes, quantity: input.quantity };
        }),

      delete: adminProcedure
        .input(z.object({
          id: z.string(),
        }))
        .mutation(async ({ input }) => {
          const { deleteVerifiedCode } = await import("./verifiedCodeService");
          return await deleteVerifiedCode(input.id);
        }),
    }),

    // Kie Credit Management
    kie: router({
      getRemainingCredits: adminProcedure.query(async () => {
        const result = await db.getKieRemainingCredits();
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch Kie credits');
        }
        return { credits: result.credits };
      }),

      getUsageLogs: adminProcedure
        .input(z.object({
          limit: z.number().min(1).max(1000).optional().default(100),
        }))
        .query(async ({ input }) => {
          return await db.getKieCreditUsageLogs(input.limit);
        }),

      getUsageStats: adminProcedure
        .input(z.object({
          period: z.enum(['daily', 'monthly']),
          days: z.number().min(1).max(365).optional().default(30),
        }))
        .query(async ({ input }) => {
          return await db.getKieCreditUsageStats(input.period, input.days);
        }),
    }),
  }),

  // Verified Code router (for user verification)
  verifiedCode: router({
    verify: protectedProcedure
      .input(z.object({ code: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const { verifyUserWithCode } = await import("./verifiedCodeService");
        return await verifyUserWithCode(ctx.user.id, input.code);
      }),

    check: protectedProcedure.query(async ({ ctx }) => {
      const user = await db.getUserById(ctx.user.id);
      return { isVerified: user?.isVerified ?? false };
    }),

    // Admin endpoints
    create: adminProcedure
      .input(
        z.object({
          code: z.string(),
          maxUses: z.number().optional(),
          expiresAt: z.string().optional(),
          note: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { createVerifiedCode } = await import("./verifiedCodeService");
        return await createVerifiedCode({
          code: input.code,
          maxUses: input.maxUses ?? null,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
          note: input.note,
          createdBy: ctx.user.id,
        });
      }),

    list: adminProcedure.query(async () => {
      const { listVerifiedCodes } = await import("./verifiedCodeService");
      return await listVerifiedCodes();
    }),

    getRedemptions: adminProcedure
      .input(z.object({ codeId: z.string() }))
      .query(async ({ input }) => {
        const { getCodeRedemptions } = await import("./verifiedCodeService");
        return await getCodeRedemptions(input.codeId);
      }),

    delete: adminProcedure
      .input(z.object({ codeId: z.string() }))
      .mutation(async ({ input }) => {
        const { deleteVerifiedCode } = await import("./verifiedCodeService");
        return await deleteVerifiedCode(input.codeId);
      }),

    toggleStatus: adminProcedure
      .input(z.object({ codeId: z.string(), isActive: z.boolean() }))
      .mutation(async ({ input }) => {
        const { toggleCodeStatus } = await import("./verifiedCodeService");
        return await toggleCodeStatus(input.codeId, input.isActive);
      }),
  }),

  // Invite code redemption (public)
  redeemInvite: protectedProcedure
    .input(z.object({ code: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invite = await db.getInviteCode(input.code);
      
      if (!invite) throw new Error("Invalid invite code");
      if (!invite.isActive) throw new Error("Invite code is inactive");
      if (invite.usedCount >= invite.maxUses) throw new Error("Invite code has been fully used");
      if (invite.expiresAt && new Date() > invite.expiresAt) throw new Error("Invite code has expired");

      // Add credits with transaction tracking
      await db.addCreditsWithTransaction(
        ctx.user.id,
        invite.credits,
        'topup',
        `Redeemed code: ${input.code}`,
        undefined,
        invite.id
      );
      await db.incrementInviteCodeUsage(input.code);

      return { credits: invite.credits };
    }),

  // Image upload endpoint
  upload: protectedProcedure
    .input(z.object({
      file: z.string(), // base64 encoded file
      filename: z.string(),
      contentType: z.string(),
      aspectRatio: z.enum(['16:9', '9:16', 'Auto']).optional(), // For auto-crop (Veo 3 mobile)
    }))
    .mutation(async ({ input }) => {
      try {
        // Decode base64 file
        let buffer = Buffer.from(input.file, 'base64');
        
        // Auto-crop if aspectRatio is provided (for Veo 3 mobile)
        if (input.aspectRatio && input.contentType.startsWith('image/')) {
          const { autoCropImage } = await import('./imageCrop');
          const croppedBuffer = await autoCropImage(buffer, input.aspectRatio);
          buffer = Buffer.from(croppedBuffer);
        }
        
        // Upload to S3
        const key = `uploads/${nanoid()}-${input.filename}`;
        await storagePut(key, buffer, input.contentType);
        
        // Get public download URL (for external API access like Kling)
        const downloadResult = await storageGet(key);
        
        return { url: downloadResult.url };
      } catch (error) {
        console.error('[Upload] Error:', error);
        throw new Error('Failed to upload file');
      }
    }),

  // Top-up router (Omise payment integration)
  // Note: OMISE_PUBLIC_KEY and OMISE_SECRET_KEY are automatically injected from project secrets
  topup: router({
    getPublicKey: publicProcedure
      .query(async ({ ctx }) => {
        const { getOmiseKeys } = await import("./systemSettingsService");
        const keys = await getOmiseKeys();
        const publicKey = keys.publicKey || ENV.omisePublicKey;
        if (!publicKey) {
          throw new Error("OMISE_PUBLIC_KEY is not configured");
        }
        return { publicKey };
      }),
    
    createCreditCardCharge: protectedProcedure
      .input(z.object({
        packageId: z.string(),
        token: z.string(), // Omise card token from frontend
      }))
      .mutation(async ({ ctx, input }) => {
        console.log("[Topup] createCreditCardCharge called:", {
          userId: ctx.user.id,
          packageId: input.packageId,
          token: input.token,
        });
        
        const { createCreditCardCharge, getPackageById } = await import("./omiseService");
        const { addCreditsWithTransaction } = await import("./db");
        
        // Create return URL (redirect back after 3D Secure)
        // Hardcode custom domain to avoid proxy header issues
        const returnUrl = "https://zenityx.studio/payment/callback";
        
        console.log("[Topup] Return URL:", returnUrl);
        
        try {
          const charge = await createCreditCardCharge(
            ctx.user.id,
            input.packageId,
            returnUrl,
            input.token // Pass token to service
          );
          
          console.log("[Topup] Charge created:", {
            id: charge.id,
            status: charge.status,
            paid: charge.paid,
            amount: charge.amount,
          });
          
          // Check if charge requires 3D Secure authorization
          const requiresAuthorization = charge.authorize_uri && !charge.authorized;
          
          // Add credits immediately if charge is successful (no 3DS required)
          if (charge.paid && charge.status === "successful" && !requiresAuthorization) {
            const pkg = getPackageById(input.packageId);
            if (pkg) {
              console.log(`[Topup] Adding ${pkg.credits} credits to user ${ctx.user.id}`);
              
              await addCreditsWithTransaction(
                ctx.user.id,
                pkg.credits,
                "topup",
                `เติมเครดิต ${pkg.credits} เครดิต (${input.packageId})`,
                {
                  chargeId: charge.id,
                  packageId: input.packageId,
                  amountPaid: charge.amount / 100, // Convert satang to THB
                },
                undefined, // relatedGenerationId
                undefined  // relatedCodeId
              );
              
              console.log(`[Topup] ✅ Credits added successfully`);
            }
          } else if (requiresAuthorization) {
            console.log(`[Topup] ⚠️ Charge requires 3D Secure authorization`);
          } else {
            console.log(`[Topup] ⚠️ Charge not successful yet: ${charge.status}`);
          }
          
          // Determine success and message
          const isSuccess = charge.paid && charge.status === "successful";
          let message = "";
          
          if (requiresAuthorization) {
            message = "กรุณายืนยันตัวตนกับธนาคาร";
          } else if (isSuccess) {
            message = "เติมเครดิตสำเร็จ";
          } else {
            message = "การชำระเงินไม่สำเร็จ กรุณาตรวจสอบข้อมูลบัตรและลองใหม่อีกครั้ง";
          }
          
          return {
            success: isSuccess,
            chargeId: charge.id,
            authorizeUri: charge.authorize_uri || null,
            requiresAuthorization,
            amount: charge.amount,
            paid: charge.paid,
            status: charge.status,
            message,
          };
        } catch (error: any) {
          console.error("[Topup] Failed to create charge:", error);
          throw new Error(error.message || "Failed to create payment charge");
        }
      }),
    
    createPromptPayCharge: protectedProcedure
      .input(z.object({
        packageId: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        console.log("[Topup] createPromptPayCharge called:", {
          userId: ctx.user.id,
          packageId: input.packageId,
        });
        
        const { createPromptPayCharge, getPackageById } = await import("./omiseService");
        
        try {
          const charge = await createPromptPayCharge(
            ctx.user.id,
            input.packageId
          );
          
          console.log("[Topup] PromptPay charge created:", {
            id: charge.id,
            status: charge.status,
            qrCodeUrl: charge.qrCodeUrl,
          });
          
          return {
            success: true,
            chargeId: charge.id,
            qrCodeUrl: charge.qrCodeUrl,
            amount: charge.amount,
            status: charge.status,
            message: "กรุณาสแกน QR Code เพื่อชำระเงิน",
          };
        } catch (error: any) {
          console.error("[Topup] Failed to create PromptPay charge:", error);
          throw new Error(error.message || "Failed to create PromptPay payment");
        }
      }),
    
    checkCharge: protectedProcedure
      .input(z.object({
        chargeId: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { getCharge, getPackageById } = await import("./omiseService");
        const { addCreditsWithTransaction, getUserCreditTransactions } = await import("./db");
        
        try {
          const charge = await getCharge(input.chargeId);
          
          // Check if payment is successful and credits haven't been added yet
          if (charge.paid && charge.status === "successful") {
            const packageId = charge.metadata?.packageId;
            const pkg = packageId ? getPackageById(packageId) : null;
            
            if (pkg) {
              // Check if credits were already added for this charge
              const transactions = await getUserCreditTransactions(ctx.user.id);
              const alreadyProcessed = transactions.some(
                (t) => t.metadata && JSON.parse(t.metadata as string).chargeId === charge.id
              );
              
              if (!alreadyProcessed) {
                console.log(`[Topup] Adding ${pkg.credits} credits to user ${ctx.user.id} for charge ${charge.id}`);
                
                await addCreditsWithTransaction(
                  ctx.user.id,
                  pkg.credits,
                  "topup",
                  `เติมเครดิต ${pkg.credits} เครดิต (${packageId})`,
                  {
                    chargeId: charge.id,
                    packageId: packageId,
                    amountPaid: charge.amount / 100, // Convert satang to THB
                  },
                  undefined, // relatedGenerationId
                  undefined  // relatedCodeId
                );
                
                console.log(`[Topup] ✅ Credits added successfully`);
              } else {
                console.log(`[Topup] ⚠️ Credits already added for charge ${charge.id}`);
              }
            }
          }
          
          return {
            id: charge.id,
            status: charge.status,
            paid: charge.paid,
            amount: charge.amount,
            metadata: charge.metadata,
          };
        } catch (error: any) {
          console.error("[Topup] Failed to check charge:", error);
          throw new Error(error.message || "Failed to check charge status");
        }
      }),
  }),

  // Thumbnail generation router
  thumbnail: router({
    generate: protectedProcedure
      .input(z.object({
        generationId: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { generateVideoThumbnail } = await import("./thumbnailGenerator");
        
        // Get generation
        const generation = await db.getGeneration(input.generationId);
        if (!generation) {
          throw new Error("Generation not found");
        }
        
        // Only owner can generate thumbnail
        if (generation.userId !== ctx.user.id) {
          throw new Error("Unauthorized");
        }
        
        // Only for video generations
        if (generation.type !== "video") {
          throw new Error("Thumbnail generation is only for videos");
        }
        
        // Check if already has thumbnail
        if (generation.thumbnailUrl) {
          return { thumbnailUrl: generation.thumbnailUrl };
        }
        
        // Get video URL (first result URL or resultUrl)
        let videoUrl: string | null = null;
        if (generation.resultUrls) {
          try {
            const urls = JSON.parse(generation.resultUrls);
            videoUrl = urls[0];
          } catch {}
        }
        if (!videoUrl) {
          videoUrl = generation.resultUrl;
        }
        
        if (!videoUrl) {
          throw new Error("No video URL found");
        }
        
        // Generate thumbnail
        const thumbnailUrl = await generateVideoThumbnail(videoUrl, ctx.user.id, input.generationId);
        
        // Update generation
        await db.updateGenerationThumbnail(input.generationId, thumbnailUrl);
        
        return { thumbnailUrl };
      }),
    
    batchGenerate: adminProcedure
      .input(z.object({
        limit: z.number().min(1).max(100).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { generateVideoThumbnail } = await import("./thumbnailGenerator");
        
        // Get videos without thumbnails (reduced batch size to prevent timeout)
        const limit = input?.limit || 10;
        const generations = await db.getVideosWithoutThumbnails(limit);
        
        console.log(`[BatchThumbnail] Processing ${generations.length} videos (limit: ${limit})`);
        
        const results = [];
        let processed = 0;
        for (const generation of generations) {
          processed++;
          console.log(`[BatchThumbnail] Processing ${processed}/${generations.length}: ${generation.id}`);
          try {
            // Get video URL
            let videoUrl: string | null = null;
            if (generation.resultUrls) {
              try {
                const urls = JSON.parse(generation.resultUrls);
                videoUrl = urls[0];
              } catch {}
            }
            if (!videoUrl) {
              videoUrl = generation.resultUrl;
            }
            
            if (!videoUrl) {
              results.push({ id: generation.id, success: false, error: "No video URL" });
              continue;
            }
            
            // Generate thumbnail
            const thumbnailUrl = await generateVideoThumbnail(videoUrl, generation.userId, generation.id);
            
            // Update generation
            await db.updateGenerationThumbnail(generation.id, thumbnailUrl);
            
            results.push({ id: generation.id, success: true, thumbnailUrl });
          } catch (error) {
            results.push({ 
              id: generation.id, 
              success: false, 
              error: error instanceof Error ? error.message : "Unknown error" 
            });
          }
        }
        
        const successCount = results.filter(r => r.success).length;
        console.log(`[BatchThumbnail] Completed: ${successCount}/${generations.length} successful`);
        
        return { 
          results,
          total: generations.length,
          successful: successCount,
          failed: generations.length - successCount
        };
      }),

    // Get thumbnail statistics from database
    getStats: adminProcedure
      .query(async () => {
        const totalVideos = await db.countGenerationsByType('video');
        const videosWithThumbnails = await db.countVideosWithThumbnails();
        const videosWithoutThumbnails = totalVideos - videosWithThumbnails;
        
        return {
          totalVideos,
          videosWithThumbnails,
          videosWithoutThumbnails,
          completionRate: totalVideos > 0 ? (videosWithThumbnails / totalVideos * 100).toFixed(1) : '0',
        };
      }),
  }),

  // Role Permissions router (Admin only)
  rolePermissions: router({ 
    getAll: adminProcedure
      .query(async () => {
        const { getAllRolePermissions } = await import("./rolePermissionsService");
        return await getAllRolePermissions();
      }),

    get: protectedProcedure
      .input(z.object({ role: z.enum(["user", "admin", "sale"]) }))
      .query(async ({ input }) => {
        const { getRolePermissions } = await import("./rolePermissionsService");
        return await getRolePermissions(input.role);
      }),

    getMyPermissions: protectedProcedure
      .query(async ({ ctx }) => {
        const { getRolePermissions } = await import("./rolePermissionsService");
        return await getRolePermissions(ctx.user.role as "user" | "admin" | "sale");
      }),

    update: adminProcedure
      .input(z.object({
        role: z.enum(["user", "admin", "sale"]),
        permissions: z.object({
          tabs: z.array(z.string()),
          canDelete: z.boolean(),
          canEdit: z.boolean(),
          canCreate: z.boolean(),
        }),
      }))
      .mutation(async ({ ctx, input }) => {
        const { updateRolePermissions } = await import("./rolePermissionsService");
        await updateRolePermissions(input.role, input.permissions, ctx.user.id);
        return { success: true };
      }),
  }),

  // System Settings router (Admin only)
  systemSettings: router({
    getAll: adminProcedure
      .query(async () => {
        const { getAllSystemSettings } = await import("./systemSettingsService");
        return await getAllSystemSettings();
      }),

    get: adminProcedure
      .input(z.object({ key: z.string() }))
      .query(async ({ input }) => {
        const { getSystemSetting } = await import("./systemSettingsService");
        return await getSystemSetting(input.key);
      }),

    set: adminProcedure
      .input(z.object({
        key: z.string(),
        value: z.string(),
        description: z.string().optional(),
        category: z.string().default("general"),
        isSecret: z.number().default(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const { setSystemSetting } = await import("./systemSettingsService");
        await setSystemSetting(
          input.key,
          input.value,
          input.description,
          input.category,
          input.isSecret,
          ctx.user.id
        );
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ key: z.string() }))
      .mutation(async ({ input }) => {
        const { deleteSystemSetting } = await import("./systemSettingsService");
        await deleteSystemSetting(input.key);
        
        // Clear Omise cache if deleting Omise keys
        if (input.key.startsWith("omise_")) {
          const { clearOmiseCache } = await import("./omiseService");
          clearOmiseCache();
        }
        
        return { success: true };
      }),

    clearCache: adminProcedure
      .mutation(async () => {
        const { clearOmiseCache } = await import("./omiseService");
        clearOmiseCache();
        return { success: true, message: "Cache cleared successfully" };
      }),
  }),

});

export type AppRouter = typeof appRouter;
