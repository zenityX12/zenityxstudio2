import { createAIModel } from "./db";
import { nanoid } from "nanoid";

async function seedModels() {
  const models = [
    // Image Generation Models
    {
      id: `model_${nanoid()}`,
      name: "4O Image",
      type: "image" as const,
      provider: "OpenAI",
      modelId: "4o-image",
      costPerGeneration: 10,
      isActive: true,
      description: "Advanced image generation model from OpenAI",
    },
    {
      id: `model_${nanoid()}`,
      name: "Flux Kontext",
      type: "image" as const,
      provider: "Flux",
      modelId: "flux-kontext",
      costPerGeneration: 15,
      isActive: true,
      description: "High-quality contextual image generation",
    },
    // Video Generation Models
    {
      id: `model_${nanoid()}`,
      name: "Veo 3.1 Quality",
      type: "video" as const,
      provider: "Google",
      modelId: "veo3",
      costPerGeneration: 50,
      isActive: true,
      description: "Flagship Veo 3.1 model with highest fidelity",
    },
    {
      id: `model_${nanoid()}`,
      name: "Veo 3.1 Fast",
      type: "video" as const,
      provider: "Google",
      modelId: "veo3_fast",
      costPerGeneration: 30,
      isActive: true,
      description: "Cost-efficient Veo 3.1 variant with strong visual results",
    },
    {
      id: `model_${nanoid()}`,
      name: "Runway Aleph",
      type: "video" as const,
      provider: "Runway",
      modelId: "runway-aleph",
      costPerGeneration: 45,
      isActive: true,
      description: "Professional video generation with Runway Aleph",
    },
    {
      id: `model_${nanoid()}`,
      name: "Runway Gen-3",
      type: "video" as const,
      provider: "Runway",
      modelId: "runway-gen3",
      costPerGeneration: 40,
      isActive: true,
      description: "Fast and efficient video generation",
    },
    {
      id: `model_${nanoid()}`,
      name: "Luma",
      type: "video" as const,
      provider: "Luma",
      modelId: "luma",
      costPerGeneration: 35,
      isActive: true,
      description: "Cinematic video generation with Luma",
    },
  ];

  for (const model of models) {
    await createAIModel({
      ...model,
      costPerGeneration: String(model.costPerGeneration),
      kiePrice: String(model.costPerGeneration), // Default kiePrice same as cost
      isActive: (model.isActive ? 1 : 0) as any,
    });
  }

  console.log(`✅ Seeded ${models.length} AI models`);
}

seedModels().catch(console.error);
