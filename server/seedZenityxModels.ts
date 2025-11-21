import * as db from "./db";

async function seedZenityxModels() {
  // Backup existing model prices before seeding
  console.log("💾 Backing up existing model prices...");
  const existingModels = await db.getAllAIModels();
  const priceBackup: Record<string, { 
    costPerGeneration: number; 
    pricingOptions: string | null;
    kiePrice: number;
    kiePricingOptions: string | null;
  }> = {};
  
  for (const model of existingModels) {
    // Use modelId as key for better matching (e.g., "kling/v2-1-pro")
    if (model.modelId) {
      priceBackup[model.modelId] = {
        costPerGeneration: Number(model.costPerGeneration),
        pricingOptions: model.pricingOptions,
        kiePrice: Number(model.kiePrice),
        kiePricingOptions: model.kiePricingOptions,
      };
    }
  }
  
  console.log(`✅ Backed up prices for ${Object.keys(priceBackup).length} models\n`);
  
  // Delete all existing models before seeding
  console.log("🗑️  Deleting all existing AI models...");
  await db.deleteAllAIModels();
  console.log("✅ All existing models deleted.\n");
  
  const models = [
    // Image Generation Models
    // Nano Banana - Text-to-Image (base model, shown in UI)
    {
      id: "nano-banana",
      name: "Nano Banana",
      type: "image" as const,
      provider: "Google",
      modelId: "google/nano-banana",
      costPerGeneration: 20,
      pricingOptions: null,
      isActive: true,
      description: "Google's Nano Banana text-to-image model",
    },
    // Nano Banana Edit - Image-to-Image (hidden, auto-selected when image uploaded)
    {
      id: "nano-banana-edit",
      name: "Nano Banana Edit",
      type: "image" as const,
      provider: "Google",
      modelId: "google/nano-banana-edit",
      costPerGeneration: 25,
      pricingOptions: null,
      isActive: true,
      description: "Google's Nano Banana image-to-image editing model",
    },
    // Seedream V4 - Text-to-Image (base model, shown in UI)
    {
      id: "seedream-v4",
      name: "Seedream V4",
      type: "image" as const,
      provider: "Bytedance",
      modelId: "bytedance/seedream-v4-text-to-image",
      costPerGeneration: 25,
      pricingOptions: null,
      isActive: true,
      description: "Bytedance Seedream V4 text-to-image model",
    },
    // Seedream V4 Edit - Image-to-Image (hidden, auto-selected when image uploaded)
    {
      id: "seedream-v4-edit",
      name: "Seedream V4 Edit",
      type: "image" as const,
      provider: "Bytedance",
      modelId: "bytedance/seedream-v4-edit",
      costPerGeneration: 30,
      pricingOptions: null,
      isActive: true,
      description: "Bytedance Seedream V4 image-to-image editing model",
    },
    
    // Ideogram Character Remix - Image-to-Image with Character Reference
    {
      id: "ideogram-character-remix",
      name: "Ideogram Character Remix",
      type: "image" as const,
      provider: "Ideogram",
      modelId: "ideogram/character-remix",
      costPerGeneration: 40,
      pricingOptions: JSON.stringify({
        TURBO: 30,
        BALANCED: 40,
        QUALITY: 50
      }),
      isActive: true,
      description: "Ideogram Character Remix - Remix images with character references and multiple rendering speeds",
    },
    
    // Ideogram Character - Text-to-Image with Character Reference
    {
      id: "ideogram-character",
      name: "Ideogram Character",
      type: "image" as const,
      provider: "Ideogram",
      modelId: "ideogram/character",
      costPerGeneration: 35,
      pricingOptions: JSON.stringify({
        TURBO: 25,
        BALANCED: 35,
        QUALITY: 45
      }),
      isActive: true,
      description: "Ideogram Character - Generate images with character references from uploaded photos",
    },
    
    // SORA 2 Models - Consolidated with duration-based pricing
    // Sora 2 Text-to-Video (base model, shown in UI)
    {
      id: "sora-2",
      name: "Sora 2",
      type: "video" as const,
      provider: "OpenAI",
      modelId: "sora-2-text-to-video",
      costPerGeneration: 60, // Default for 10s
      pricingOptions: JSON.stringify({ "10s": 60, "15s": 90 }),
      isActive: true,
      description: "OpenAI Sora 2 text-to-video generation",
    },
    // Sora 2 Image-to-Video (hidden, auto-selected when image uploaded)
    {
      id: "sora-2-image-to-video",
      name: "Sora 2 Image-to-Video",
      type: "video" as const,
      provider: "OpenAI",
      modelId: "sora-2-image-to-video",
      costPerGeneration: 70, // Default for 10s
      pricingOptions: JSON.stringify({ "10s": 70, "15s": 105 }),
      isActive: true,
      description: "OpenAI Sora 2 image-to-video generation",
    },
    
    // Sora 2 Pro Text-to-Video (base model, shown in UI)
    {
      id: "sora-2-pro",
      name: "Sora 2 Pro",
      type: "video" as const,
      provider: "OpenAI",
      modelId: "sora-2-pro-text-to-video",
      costPerGeneration: 80, // Default for 10s standard
      pricingOptions: JSON.stringify({ 
        "10s-standard": 80, 
        "10s-high": 100,
        "15s-standard": 120, 
        "15s-high": 150 
      }),
      isActive: true,
      description: "OpenAI Sora 2 Pro text-to-video with quality options",
    },
    // Sora 2 Pro Image-to-Video (hidden, auto-selected when image uploaded)
    {
      id: "sora-2-pro-image-to-video",
      name: "Sora 2 Pro Image-to-Video",
      type: "video" as const,
      provider: "OpenAI",
      modelId: "sora-2-pro-image-to-video",
      costPerGeneration: 90, // Default for 10s standard
      pricingOptions: JSON.stringify({ 
        "10s-standard": 90, 
        "10s-high": 110,
        "15s-standard": 135, 
        "15s-high": 165 
      }),
      isActive: true,
      description: "OpenAI Sora 2 Pro image-to-video with quality options",
    },
    
    // Sora 2 Pro Storyboard (shown in UI, no image upload support, no quality option)
    {
      id: "sora-2-pro-storyboard",
      name: "Sora 2 Pro Storyboard",
      type: "video" as const,
      provider: "OpenAI",
      modelId: "sora-2-pro-storyboard",
      costPerGeneration: 90, // Default for 10s
      pricingOptions: JSON.stringify({ 
        "10s": 90, 
        "15s": 135, 
        "25s": 255 
      }),
      isActive: true,
      description: "OpenAI Sora 2 Pro Storyboard for multi-scene generation",
    },
    
    // Veo 3.1 Models
    {
      id: "veo-3-1-fast",
      name: "Veo 3.1 Fast",
      type: "video" as const,
      provider: "Google",
      modelId: "veo3_fast",
      costPerGeneration: 30,
      pricingOptions: null,
      isActive: true,
      description: "Fast Veo 3.1 video generation",
    },
    {
      id: "veo-3-1-quality",
      name: "Veo 3.1 Quality",
      type: "video" as const,
      provider: "Google",
      modelId: "veo3",
      costPerGeneration: 50,
      pricingOptions: null,
      isActive: true,
      description: "High quality Veo 3.1 video generation",
    },
    
    // Kling 2.1 Models (with duration-based pricing)
    {
      id: "kling-2-1-standard",
      name: "Kling 2.1 Standard",
      type: "video" as const,
      provider: "Kuaishou",
      modelId: "kling/v2-1-standard",
      costPerGeneration: 40, // Default for 5s
      pricingOptions: JSON.stringify({ "5s": 40, "10s": 80 }),
      isActive: true,
      description: "Kuaishou Kling 2.1 Standard image-to-video generation",
    },
    {
      id: "kling-2-1-pro",
      name: "Kling 2.1 Pro",
      type: "video" as const,
      provider: "Kuaishou",
      modelId: "kling/v2-1-pro",
      costPerGeneration: 60, // Default for 5s
      pricingOptions: JSON.stringify({ "5s": 60, "10s": 120 }),
      isActive: true,
      description: "Kuaishou Kling 2.1 Pro image-to-video with end frame support",
    },
    
    // Seedance Models (with resolution + duration pricing)
    {
      id: "v1-lite-text-to-video",
      name: "V1 Lite Text-to-Video",
      type: "video" as const,
      provider: "Bytedance",
      modelId: "bytedance/v1-lite-text-to-video",
      costPerGeneration: 10, // Default for 480p-5s
      pricingOptions: JSON.stringify({
        "480p-5s": 10, "480p-10s": 15,
        "720p-5s": 20, "720p-10s": 30,
        "1080p-5s": 40, "1080p-10s": 60
      }),
      isActive: true,
      description: "Bytedance V1 Lite text-to-video",
    },
    {
      id: "v1-lite-image-to-video",
      name: "V1 Lite Image-to-Video",
      type: "video" as const,
      provider: "Bytedance",
      modelId: "bytedance/v1-lite-image-to-video",
      costPerGeneration: 12, // Default for 480p-5s
      pricingOptions: JSON.stringify({
        "480p-5s": 12, "480p-10s": 18,
        "720p-5s": 25, "720p-10s": 35,
        "1080p-5s": 45, "1080p-10s": 65
      }),
      isActive: true,
      description: "Bytedance V1 Lite image-to-video",
    },
    {
      id: "v1-pro-text-to-video",
      name: "V1 Pro Text-to-Video",
      type: "video" as const,
      provider: "Bytedance",
      modelId: "bytedance/v1-pro-text-to-video",
      costPerGeneration: 15, // Default for 480p-5s
      pricingOptions: JSON.stringify({
        "480p-5s": 15, "480p-10s": 22,
        "720p-5s": 30, "720p-10s": 45,
        "1080p-5s": 60, "1080p-10s": 90
      }),
      isActive: true,
      description: "Bytedance V1 Pro text-to-video",
    },
    {
      id: "v1-pro-image-to-video",
      name: "V1 Pro Image-to-Video",
      type: "video" as const,
      provider: "Bytedance",
      modelId: "bytedance/v1-pro-image-to-video",
      costPerGeneration: 18, // Default for 480p-5s
      pricingOptions: JSON.stringify({
        "480p-5s": 18, "480p-10s": 27,
        "720p-5s": 35, "720p-10s": 52,
        "1080p-5s": 70, "1080p-10s": 105
      }),
      isActive: true,
      description: "Bytedance V1 Pro image-to-video",
    },
  ];

  console.log(`🌱 Seeding ${models.length} ZenityX AI models...`);
  
  for (const model of models) {
    try {
      // Check if we have a price backup for this model (by modelId)
      const backup = priceBackup[model.modelId];
      
      // If backup exists, use the admin-configured prices instead of default prices
      const modelData = backup ? {
        ...model,
        costPerGeneration: String(backup.costPerGeneration),
        pricingOptions: backup.pricingOptions,
        kiePrice: String(backup.kiePrice),
        kiePricingOptions: backup.kiePricingOptions,
        isActive: (model.isActive ? 1 : 0) as any,
      } : {
        ...model,
        costPerGeneration: String(model.costPerGeneration),
        kiePrice: String(model.costPerGeneration), // Default kiePrice same as cost
        isActive: (model.isActive ? 1 : 0) as any,
      };
      
      await db.createAIModel(modelData);
      
      if (backup) {
        console.log(`✅ Created: ${model.name} (restored admin pricing)`);
      } else {
        console.log(`✅ Created: ${model.name} (default pricing)`);
      }
    } catch (error: any) {
      if (error.message?.includes('Duplicate entry')) {
        console.log(`⏭️  Skipped: ${model.name} (already exists)`);
      } else {
        console.error(`❌ Failed to create ${model.name}:`, error.message);
      }
    }
  }

  console.log(`\n✅ Seeding complete!`);
  console.log(`📊 Restored pricing for ${Object.keys(priceBackup).length} existing models`);
}

seedZenityxModels().catch(console.error);

