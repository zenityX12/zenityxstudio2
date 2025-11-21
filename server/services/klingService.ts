/**
 * Kling API Service
 * 
 * Integrates with Kie.ai's Kling 2.1 models (Standard and Pro)
 * 
 * Models:
 * - kling/v2-1-standard: Standard quality video generation
 * - kling/v2-1-pro: Pro quality with end frame support
 * 
 * API Documentation: https://api.kie.ai/docs
 */

const KIE_API_BASE_URL = "https://api.kie.ai/api/v1";

interface KlingCreateTaskInput {
  prompt: string;
  image_url: string;
  duration?: "5" | "10";
  negative_prompt?: string;
  cfg_scale?: number;
  tail_image_url?: string; // Only for Pro model
}

interface KlingCreateTaskRequest {
  model: "kling/v2-1-standard" | "kling/v2-1-pro";
  input: KlingCreateTaskInput;
  callBackUrl?: string;
}

interface KlingCreateTaskResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
  };
}

interface KlingTaskStatus {
  code: number;
  msg: string;
  data: {
    taskId: string;
    model: string;
    state: "waiting" | "success" | "fail";
    param: string; // JSON string
    resultJson: string; // JSON string with {resultUrls: []}
    failCode: string | null;
    failMsg: string | null;
    costTime: number | null;
    completeTime: number | null;
    createTime: number;
  };
}

/**
 * Create a Kling video generation task
 */
export async function createKlingTask(
  modelId: string,
  input: {
    prompt: string;
    firstFrameUrl: string;
    endFrameUrl?: string;
    duration?: "5" | "10";
    negativePrompt?: string;
    cfgScale?: number;
  },
  callBackUrl?: string
): Promise<{ taskId: string }> {
  const apiKey = process.env.KIE_API_KEY;
  if (!apiKey) {
    throw new Error("KIE_API_KEY is not configured");
  }

  // Map internal model ID to Kling API format
  let klingModel: "kling/v2-1-standard" | "kling/v2-1-pro";
  if (modelId === "kling-2-1-standard") {
    klingModel = "kling/v2-1-standard";
  } else if (modelId === "kling-2-1-pro") {
    klingModel = "kling/v2-1-pro";
  } else {
    throw new Error(`Unknown Kling model: ${modelId}`);
  }

  const requestBody: KlingCreateTaskRequest = {
    model: klingModel,
    input: {
      prompt: input.prompt,
      image_url: input.firstFrameUrl,
      duration: input.duration || "5",
      negative_prompt: input.negativePrompt || "blur, distort, and low quality",
      cfg_scale: input.cfgScale !== undefined ? input.cfgScale : 0.5,
    },
  };

  // Add tail_image_url only for Pro model and if provided
  if (klingModel === "kling/v2-1-pro" && input.endFrameUrl) {
    requestBody.input.tail_image_url = input.endFrameUrl;
  }

  // Add callback URL if provided
  if (callBackUrl) {
    requestBody.callBackUrl = callBackUrl;
  }

  console.log("[Kling] Creating task:", {
    model: klingModel,
    duration: requestBody.input.duration,
    hasEndFrame: !!requestBody.input.tail_image_url,
    callBackUrl: callBackUrl || "none",
  });

  const response = await fetch(`${KIE_API_BASE_URL}/jobs/createTask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Kling] API Error:", {
      status: response.status,
      statusText: response.statusText,
      body: errorText,
    });
    throw new Error(`Kling API error: ${response.status} ${response.statusText}`);
  }

  const data: KlingCreateTaskResponse = await response.json();

  if (data.code !== 200) {
    console.error("[Kling] Task creation failed:", data);
    throw new Error(`Kling task creation failed: ${data.msg}`);
  }

  console.log("[Kling] Task created successfully:", data.data.taskId);
  return { taskId: data.data.taskId };
}

/**
 * Query Kling task status
 */
export async function getKlingTaskStatus(taskId: string): Promise<{
  state: "waiting" | "success" | "fail";
  resultUrls?: string[];
  failMsg?: string;
}> {
  const apiKey = process.env.KIE_API_KEY;
  if (!apiKey) {
    throw new Error("KIE_API_KEY is not configured");
  }

  const response = await fetch(
    `${KIE_API_BASE_URL}/jobs/recordInfo?taskId=${taskId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Kling] Status check error:", {
      status: response.status,
      statusText: response.statusText,
      body: errorText,
    });
    throw new Error(`Kling API error: ${response.status} ${response.statusText}`);
  }

  const data: KlingTaskStatus = await response.json();

  if (data.code !== 200) {
    console.error("[Kling] Status check failed:", data);
    throw new Error(`Kling status check failed: ${data.msg}`);
  }

  const result: {
    state: "waiting" | "success" | "fail";
    resultUrls?: string[];
    failMsg?: string;
  } = {
    state: data.data.state,
  };

  if (data.data.state === "success" && data.data.resultJson) {
    try {
      const resultData = JSON.parse(data.data.resultJson);
      result.resultUrls = resultData.resultUrls || [];
    } catch (error) {
      console.error("[Kling] Failed to parse resultJson:", error);
    }
  }

  if (data.data.state === "fail") {
    result.failMsg = data.data.failMsg || "Unknown error";
  }

  return result;
}

