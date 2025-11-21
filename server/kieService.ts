import { getActiveAPIKey } from "./db";
import { ENV } from "./_core/env";

interface KieGenerationRequest {
  model: string;
  prompt?: string; // Optional for Storyboard (uses shots instead)
  type: "image" | "video";
  // Image generation options (Seedream V4, Google Nano Banana)
  aspectRatio?: string; // For both image and video
  imageUrl?: string; // For Seedream V4 Edit and Character Remix
  imageResolution?: "1K" | "2K" | "4K"; // For Seedream V4 resolution
  // Nano Banana options
  outputFormat?: "png" | "jpeg"; // For Nano Banana output format
  // Seedream V4 batch options
  maxImages?: number; // 1-6 for Seedream V4
  // Ideogram Character Remix options
  referenceImageUrls?: string[]; // Character reference images
  renderingSpeed?: "TURBO" | "BALANCED" | "QUALITY";
  style?: "AUTO" | "REALISTIC" | "FICTION";
  expandPrompt?: boolean;
  numImages?: "1" | "2" | "3" | "4"; // Batch generation for Ideogram
  strength?: number; // 0.1-1.0 for Character Remix
  negativePrompt?: string;
  styleImageUrls?: string[]; // Style reference images for Character Remix
  referenceMaskUrls?: string; // Mask for character reference
  // Veo 3.1 advanced options
  imageUrls?: string[];
  generationType?: "TEXT_2_VIDEO" | "FIRST_AND_LAST_FRAMES_2_VIDEO" | "REFERENCE_2_VIDEO";
  firstFrameUrl?: string; // For FIRST_AND_LAST_FRAMES_2_VIDEO
  lastFrameUrl?: string;  // For FIRST_AND_LAST_FRAMES_2_VIDEO
  seeds?: number;
  watermark?: string;
  enableTranslation?: boolean;
  // SORA 2 options
  nFrames?: "10" | "15" | "25"; // Duration in seconds (25 for Storyboard)
  removeWatermark?: boolean;
  size?: "standard" | "high"; // For Sora 2 Pro only
  shots?: Array<{ Scene: string; duration: number }>; // For Sora 2 Pro Storyboard
  // Seedance (Bytedance) options
  resolution?: "480p" | "720p" | "1080p";
  duration?: "5" | "10";
  cameraFixed?: boolean;
  seed?: number;
  enableSafetyChecker?: boolean;
  endImageUrl?: string;
}

interface KieGenerationResponse {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  resultUrl?: string;
  resultUrls?: string[]; // Array of all result URLs (for multiple images/videos)
  error?: string;
}

const KIE_API_BASE = "https://api.kie.ai";

/**
 * Generate image or video using Kie AI API
 */
export async function generateWithKie(request: KieGenerationRequest): Promise<KieGenerationResponse> {
  const apiKey = await getActiveAPIKey();
  
  if (!apiKey) {
    throw new Error("No active API key found. Please configure an API key in the admin panel.");
  }

  // Check budget
  if (apiKey.monthlyBudget > 0 && apiKey.currentSpend >= apiKey.monthlyBudget) {
    throw new Error("Monthly budget exceeded. Please contact administrator.");
  }

  try {
    let endpoint = "";
    let requestBody: any = {};

    // Determine endpoint based on model type
    if (request.type === "image") {
      if (request.model === "4o-image") {
        endpoint = `${KIE_API_BASE}/api/v1/gpt4o-image/generate`;
        requestBody = {
          prompt: request.prompt,
          size: "1:1",
          nVariants: 1,
          isEnhance: false,
          enableFallback: false,
        };
      } else if (request.model === "flux-kontext" || request.model === "flux-kontext-pro" || request.model === "flux-kontext-max") {
        endpoint = `${KIE_API_BASE}/api/v1/flux-kontext/generate`;
        requestBody = {
          model: request.model === "flux-kontext" ? "flux-kontext-pro" : request.model,
          prompt: request.prompt,
          aspectRatio: "1:1",
        };
      } else if (request.model.startsWith("bytedance/seedream-v4") || request.model.startsWith("google/nano-banana") || request.model.startsWith("ideogram/")) {
        // Seedream V4, Google Nano Banana, and Ideogram models use unified /api/v1/jobs/createTask endpoint
        endpoint = `${KIE_API_BASE}/api/v1/jobs/createTask`;
        
        const inputParams: any = {
          prompt: request.prompt,
        };
        
        // Map aspect ratio for Seedream V4
        if (request.model.startsWith("bytedance/seedream-v4")) {
          // Map aspect ratio to Seedream V4 format
          // Accept both ratio format (9:16) and API format (portrait_16_9)
          const aspectRatioMap: Record<string, string> = {
            // Ratio format
            "1:1": "square",
            "16:9": "landscape_16_9",
            "9:16": "portrait_16_9",
            "4:3": "landscape_4_3",
            "3:4": "portrait_4_3",
            "3:2": "landscape_3_2",
            "2:3": "portrait_3_2",
            "21:9": "landscape_21_9",
            // API format (pass-through)
            "square": "square",
            "square_hd": "square_hd",
            "portrait_4_3": "portrait_4_3",
            "portrait_3_2": "portrait_3_2",
            "portrait_16_9": "portrait_16_9",
            "landscape_4_3": "landscape_4_3",
            "landscape_3_2": "landscape_3_2",
            "landscape_16_9": "landscape_16_9",
            "landscape_21_9": "landscape_21_9",
          };
          
          // Build inputParams in correct order according to API documentation
          const orderedParams: any = {
            prompt: request.prompt,
          };
          
          // For Seedream V4 Edit: add image_urls after prompt
          if (request.imageUrls && request.imageUrls.length > 0) {
            orderedParams.image_urls = request.imageUrls;
          }
          
          // Add remaining parameters in order
          orderedParams.image_size = aspectRatioMap[request.aspectRatio || "1:1"] || "square_hd";
          orderedParams.image_resolution = request.imageResolution || "1K";
          orderedParams.max_images = request.maxImages || 1;
          
          // Note: seed parameter removed as per user request
          
          // Replace inputParams with ordered version
          Object.assign(inputParams, orderedParams);
        } else if (request.model.startsWith("google/nano-banana")) {
          // Google Nano Banana aspect ratio format
          inputParams.image_size = request.aspectRatio || "1:1";
          inputParams.output_format = request.outputFormat || "png";
          
          // Add image_urls for Google Nano Banana Edit
          if (request.imageUrls && request.imageUrls.length > 0) {
            inputParams.image_urls = request.imageUrls;
          }
        } else if (request.model.startsWith("ideogram/")) {
          // Ideogram models (Character Remix and Character)
          inputParams.prompt = request.prompt;
          
          // Common Ideogram parameters
          if (request.referenceImageUrls && request.referenceImageUrls.length > 0) {
            inputParams.reference_image_urls = request.referenceImageUrls;
          }
          
          if (request.renderingSpeed) {
            inputParams.rendering_speed = request.renderingSpeed;
          }
          
          if (request.style) {
            inputParams.style = request.style;
          }
          
          if (request.expandPrompt !== undefined) {
            inputParams.expand_prompt = request.expandPrompt;
          }
          
          if (request.numImages) {
            inputParams.num_images = request.numImages;
          }
          
          // Map aspect ratio to Ideogram format
          // Accept both ratio format (9:16) and API format (portrait_16_9)
          const ideogramAspectRatioMap: Record<string, string> = {
            // Ratio format
            "1:1": "square",
            "16:9": "landscape_16_9",
            "9:16": "portrait_16_9",
            "4:3": "landscape_4_3",
            "3:4": "portrait_4_3",
            // API format (pass-through)
            "square": "square",
            "square_hd": "square_hd",
            "portrait_4_3": "portrait_4_3",
            "portrait_16_9": "portrait_16_9",
            "landscape_4_3": "landscape_4_3",
            "landscape_16_9": "landscape_16_9",
          };
          inputParams.image_size = ideogramAspectRatioMap[request.aspectRatio || "1:1"] || "square_hd";
          
          if (request.seed !== undefined) {
            inputParams.seed = request.seed;
          }
          
          if (request.negativePrompt) {
            inputParams.negative_prompt = request.negativePrompt;
          }
          
          // Character Remix specific parameters
          if (request.model === "ideogram/character-remix") {
            if (request.imageUrl) {
              inputParams.image_url = request.imageUrl;
            }
            
            if (request.strength !== undefined) {
              inputParams.strength = request.strength;
            }
            
            if (request.styleImageUrls && request.styleImageUrls.length > 0) {
              inputParams.image_urls = request.styleImageUrls;
            }
            
            if (request.referenceMaskUrls) {
              inputParams.reference_mask_urls = request.referenceMaskUrls;
            }
          }
        }
        
        requestBody = {
          model: request.model,
          input: inputParams,
          callBackUrl: ENV.webhookBaseUrl ? `${ENV.webhookBaseUrl}/api/webhook/kie-callback` : undefined,
        };
      }
    } else if (request.type === "video") {
      // Video generation endpoints
      if (request.model === "veo3" || request.model === "veo3_fast" || request.model === "veo-3-1" || request.model === "veo-3-1-fast") {

        endpoint = `${KIE_API_BASE}/api/v1/veo/generate`;
        requestBody = {
          prompt: request.prompt,
          model: request.model,
          aspectRatio: request.aspectRatio || "16:9",
          generationType: request.generationType || "TEXT_2_VIDEO",
          callBackUrl: ENV.webhookBaseUrl ? `${ENV.webhookBaseUrl}/api/webhook/kie-callback` : undefined,
        };
        
        // Add imageUrls if provided
        if (request.imageUrls && request.imageUrls.length > 0) {
          requestBody.imageUrls = request.imageUrls;
        } else if (request.firstFrameUrl || request.lastFrameUrl) {
          // Convert firstFrameUrl/lastFrameUrl to imageUrls array (for mobile)
          const imageUrls: string[] = [];
          if (request.firstFrameUrl) {
            imageUrls.push(request.firstFrameUrl);
          }
          if (request.lastFrameUrl) {
            imageUrls.push(request.lastFrameUrl);
          }
          if (imageUrls.length > 0) {
            requestBody.imageUrls = imageUrls;
          }
        }
        
        // Add seeds if provided
        if (request.seeds !== undefined) {
          requestBody.seeds = request.seeds;
        }
        
        // Add watermark if provided
        if (request.watermark) {
          requestBody.watermark = request.watermark;
        }
        
        // Add enableTranslation (default true)
        requestBody.enableTranslation = request.enableTranslation !== undefined ? request.enableTranslation : true;
      } else if (request.model === "runway-gen3") {
        endpoint = `${KIE_API_BASE}/api/v1/runway/generate`;
        requestBody = {
          prompt: request.prompt,
          aspectRatio: "16:9",
        };
      } else if (request.model === "luma") {
        endpoint = `${KIE_API_BASE}/api/v1/luma/generate`;
        requestBody = {
          prompt: request.prompt,
        };
      } else if (request.model.startsWith("sora-2") || request.model.startsWith("sora-watermark")) {
        // SORA 2 models use unified /api/v1/jobs/createTask endpoint
        endpoint = `${KIE_API_BASE}/api/v1/jobs/createTask`;
        
        const inputParams: any = {};
        
        // For Sora 2 Pro Storyboard, prompt is optional (Image-to-Video only)
        if (request.model !== "sora-2-pro-storyboard" && request.prompt) {
          inputParams.prompt = request.prompt;
        }
        
        // Add aspect_ratio for SORA 2 (portrait/landscape)
        if (request.aspectRatio) {
          inputParams.aspect_ratio = request.aspectRatio === "16:9" ? "landscape" : 
                                     request.aspectRatio === "9:16" ? "portrait" : "landscape";
        }
        
        // Add n_frames (duration) - required for Storyboard
        if (request.nFrames) {
          inputParams.n_frames = request.nFrames;
        }
        
        // Always enable watermark removal for SORA 2
        inputParams.remove_watermark = true;
        
        // Add size option for Sora 2 Pro (text-to-video and image-to-video)
        if (request.size && (request.model === "sora-2-pro-text-to-video" || request.model === "sora-2-pro-image-to-video")) {
          inputParams.size = request.size;
        }
        
        // Add image_urls for Image-to-Video models
        if (request.imageUrls && request.imageUrls.length > 0) {
          inputParams.image_urls = request.imageUrls;
        }
        
        // Add shots for Sora 2 Pro Storyboard
        if (request.shots && request.shots.length > 0) {
          inputParams.shots = request.shots;
        }
        
        // Use exact model names as per Kie.ai documentation
        requestBody = {
          model: request.model,
          input: inputParams,
          callBackUrl: ENV.webhookBaseUrl ? `${ENV.webhookBaseUrl}/api/webhook/kie-callback` : undefined,
        };
      } else if (request.model.startsWith("kling/v2-1")) {
        // Kling 2.1 models use unified /api/v1/jobs/createTask endpoint
        endpoint = `${KIE_API_BASE}/api/v1/jobs/createTask`;
        
        const inputParams: any = {
          prompt: request.prompt,
          image_url: request.imageUrl, // First frame (required)
        };
        
        // Add tail_image_url for Pro model (optional)
        if (request.model === "kling/v2-1-pro" && request.endImageUrl) {
          inputParams.tail_image_url = request.endImageUrl;
        }
        
        // Add duration (5s or 10s)
        if (request.duration) {
          inputParams.duration = request.duration;
        }
        
        // Add negative_prompt
        if (request.negativePrompt) {
          inputParams.negative_prompt = request.negativePrompt;
        }
        
        // Add cfg_scale (0-1, default 0.5)
        if (request.seed !== undefined) {
          inputParams.cfg_scale = request.seed; // Reuse seed field for cfg_scale
        }
        
        requestBody = {
          model: request.model,
          input: inputParams,
          callBackUrl: ENV.webhookBaseUrl ? `${ENV.webhookBaseUrl}/api/webhook/kie-callback` : undefined,
        };
      } else if (request.model.startsWith("bytedance/v1")) {
        // Seedance (Bytedance) models use unified /api/v1/jobs/createTask endpoint
        endpoint = `${KIE_API_BASE}/api/v1/jobs/createTask`;
        
        const inputParams: any = {
          prompt: request.prompt,
        };
        
        // Add image_url for Image-to-Video and Image-to-Image models
        if (request.imageUrl) {
          inputParams.image_url = request.imageUrl;
        }
        
        // Add end_image_url for Image-to-Video models
        if (request.endImageUrl) {
          inputParams.end_image_url = request.endImageUrl;
        }
        
        // Add aspect_ratio
        if (request.aspectRatio) {
          inputParams.aspect_ratio = request.aspectRatio;
        }
        
        // Add resolution (for video and image models)
        if (request.resolution) {
          inputParams.resolution = request.resolution;
        }
        
        // Add duration (for video models only)
        if (request.duration && request.type === "video") {
          inputParams.duration = request.duration;
        }
        
        // Add camera_fixed (for video models only)
        if (request.cameraFixed !== undefined && request.type === "video") {
          inputParams.camera_fixed = request.cameraFixed;
        }
        
        // Add seed
        if (request.seed !== undefined) {
          inputParams.seed = request.seed;
        }
        
        // Add enable_safety_checker (default: false as requested)
        inputParams.enable_safety_checker = request.enableSafetyChecker !== undefined ? request.enableSafetyChecker : false;
        
        requestBody = {
          model: request.model,
          input: inputParams,
          callBackUrl: ENV.webhookBaseUrl ? `${ENV.webhookBaseUrl}/api/webhook/kie-callback` : undefined,
        };
      }
    }

    if (!endpoint) {
      throw new Error(`Unsupported model: ${request.model}`);
    }

    console.log(`[KieService] Calling ${endpoint} with prompt: ${request.prompt}`);
    console.log(`[KieService] Request body:`, JSON.stringify(requestBody, null, 2));
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok || data.code !== 200) {
      console.error("[KieService] API error:", data);
      throw new Error(data.msg || "Failed to generate content");
    }

    return {
      id: data.data.taskId,
      status: "pending",
    };
  } catch (error) {
    console.error("[KieService] Generation failed:", error);
    throw error;
  }
}

/**
 * Check generation status from Kie AI API
 */
export async function checkGenerationStatus(
  generationId: string,
  modelType: "image" | "video",
  model: string
): Promise<KieGenerationResponse> {
  const apiKey = await getActiveAPIKey();
  
  if (!apiKey) {
    throw new Error("No active API key found.");
  }

  try {
    let endpoint = "";

    // Determine status check endpoint based on model
    if (modelType === "image") {
      if (model === "4o-image") {
        endpoint = `${KIE_API_BASE}/api/v1/gpt4o-image/record-info?taskId=${generationId}`;
      } else if (model === "flux-kontext" || model === "flux-kontext-pro" || model === "flux-kontext-max") {
        endpoint = `${KIE_API_BASE}/api/v1/flux-kontext/record-info?taskId=${generationId}`;
      } else if (model.startsWith("bytedance/seedream-v4") || model.startsWith("google/nano-banana") || model.startsWith("ideogram/")) {
        // Seedream V4, Google Nano Banana, and Ideogram models use unified /api/v1/jobs/recordInfo endpoint
        endpoint = `${KIE_API_BASE}/api/v1/jobs/recordInfo?taskId=${generationId}`;
      }
    } else if (modelType === "video") {
      if (model === "veo3" || model === "veo3_fast") {
        endpoint = `${KIE_API_BASE}/api/v1/veo/record-info?taskId=${generationId}`;
      } else if (model === "runway-gen3") {
        endpoint = `${KIE_API_BASE}/api/v1/runway/record-info?taskId=${generationId}`;
      } else if (model === "luma") {
        endpoint = `${KIE_API_BASE}/api/v1/luma/record-info?taskId=${generationId}`;
      } else if (model.startsWith("sora-2") || model.startsWith("sora-watermark")) {
        // SORA 2 models use unified /api/v1/jobs/recordInfo endpoint
        endpoint = `${KIE_API_BASE}/api/v1/jobs/recordInfo?taskId=${generationId}`;
      } else if (model.startsWith("kling/v2-1")) {
        // Kling 2.1 models use unified /api/v1/jobs/recordInfo endpoint
        endpoint = `${KIE_API_BASE}/api/v1/jobs/recordInfo?taskId=${generationId}`;
      } else if (model.startsWith("bytedance/v1")) {
        // Seedance models use unified /api/v1/jobs/recordInfo endpoint
        endpoint = `${KIE_API_BASE}/api/v1/jobs/recordInfo?taskId=${generationId}`;
      }
    }

    if (!endpoint) {
      throw new Error(`Unsupported model for status check: ${model}`);
    }

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey.apiKey}`,
      },
    });

    const data = await response.json();

    // Handle error codes (400, 422, 500, 501) by returning failed status
    // Don't throw error, so polling can update generation status to "failed"
    if (!response.ok || (data.code && data.code !== 200)) {
      console.error("[KieService] Status check error:", data);
      const errorMessage = data.msg || "Failed to check status";
      const errorCode = data.code || response.status;
      
      return {
        id: generationId,
        status: "failed",
        error: `[Code ${errorCode}] ${errorMessage}`,
      };
    }

    const taskData = data.data;

    // Handle unified /api/v1/jobs/recordInfo response format (SORA 2, Seedream V4, Google Nano Banana, Seedance, Ideogram, Kling)
    if (model.startsWith("sora-2") || model.startsWith("sora-watermark") || model.startsWith("bytedance/seedream-v4") || model.startsWith("google/nano-banana") || model.startsWith("bytedance/v1") || model.startsWith("ideogram/") || model.startsWith("kling/v2-1")) {
      console.log(`[KieService] Unified API Task ${generationId} status:`, {
        state: taskData.state,
        resultJson: taskData.resultJson,
      });

      // SORA 2 uses "state" field: "pending", "processing", "success", "failed"
      if (taskData.state === "success") {
        // Parse resultJson which is a JSON string
        let resultUrl: string | undefined;
        let resultUrls: string[] | undefined;
        try {
          const resultData = JSON.parse(taskData.resultJson || "{}");
          // resultData can have resultUrl or resultUrls array
          if (resultData.resultUrls && Array.isArray(resultData.resultUrls)) {
            resultUrls = resultData.resultUrls;
            resultUrl = resultUrls?.[0]; // First URL for backward compatibility
          } else if (resultData.resultUrl) {
            resultUrl = resultData.resultUrl;
            resultUrls = resultUrl ? [resultUrl] : []; // Wrap single URL in array
          }
        } catch (e) {
          console.error("[KieService] Failed to parse resultJson:", e);
        }
        
        console.log(`[KieService] Generation completed with ${resultUrls?.length || 1} result(s)`);
        
        return {
          id: generationId,
          status: "completed",
          resultUrl: resultUrl || undefined,
          resultUrls: resultUrls || undefined,
        };
      } else if (taskData.state === "failed") {
        return {
          id: generationId,
          status: "failed",
          error: taskData.failMsg || "Generation failed",
        };
      } else {
        // "pending" or "processing"
        return {
          id: generationId,
          status: "processing",
        };
      }
    }

    // Handle other models (Veo, Runway, Luma, etc.) with successFlag format
    console.log(`[KieService] Task ${generationId} status:`, {
      successFlag: taskData.successFlag,
      hasResponse: !!taskData.response,
      resultUrls: taskData.response?.resultUrls,
    });

    // Parse successFlag
    // 0: Generating, 1: Success, 2: Failed, 3: Error
    if (taskData.successFlag === 1) {
      const resultUrls = taskData.response?.resultUrls || [];
      const resultUrl = resultUrls[0];
      
      console.log(`[KieService] Generation completed with URL:`, resultUrl);
      
      return {
        id: generationId,
        status: "completed",
        resultUrl: resultUrl || undefined,
      };
    } else if (taskData.successFlag === 2 || taskData.successFlag === 3) {
      // successFlag 2: Failed, successFlag 3: Error (e.g., content policy violation)
      const errorMessage = taskData.errorMessage || taskData.msg || "Generation failed";
      console.log(`[KieService] Generation failed with successFlag ${taskData.successFlag}: ${errorMessage}`);
      
      return {
        id: generationId,
        status: "failed",
        error: errorMessage,
      };
    } else {
      return {
        id: generationId,
        status: "processing",
      };
    }
  } catch (error) {
    console.error("[KieService] Status check failed:", error);
    throw error;
  }
}



/**
 * Get 1080P version of a video (Veo 3.1 only, 16:9 aspect ratio only)
 */
export async function get1080pVideo(taskId: string): Promise<{ url: string }> {
  const apiKey = await getActiveAPIKey();
  
  if (!apiKey) {
    throw new Error("No active API key found.");
  }

  try {
    const endpoint = `${KIE_API_BASE}/api/v1/veo/get-1080p-video?taskId=${taskId}`;

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey.apiKey}`,
      },
    });

    const data = await response.json();

    if (!response.ok || data.code !== 200) {
      console.error("[KieService] 1080p fetch error:", data);
      throw new Error(data.msg || "Failed to get 1080p video");
    }

    const videoUrl = data.data?.videoUrl;
    
    if (!videoUrl) {
      throw new Error("1080p video not ready yet. Please try again in a few minutes.");
    }

    console.log(`[KieService] 1080p video URL:`, videoUrl);
    
    return { url: videoUrl };
  } catch (error) {
    console.error("[KieService] 1080p fetch failed:", error);
    throw error;
  }
}

