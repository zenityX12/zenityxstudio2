import * as db from "./db";

async function checkPricing() {
  console.log("=== Checking Sora 2 and Veo Pricing ===\n");
  
  const models = await db.getAllAIModels();
  
  const soraAndVeoModels = models.filter((m: any) => 
    m.modelId.includes('sora') || m.modelId.includes('veo')
  );
  
  for (const model of soraAndVeoModels) {
    console.log(`\n📦 ${model.name}`);
    console.log(`   ID: ${model.id}`);
    console.log(`   ModelID: ${model.modelId}`);
    console.log(`   Cost Per Generation: ${model.costPerGeneration}`);
    console.log(`   Pricing Options: ${model.pricingOptions || 'null'}`);
    
    if (model.pricingOptions) {
      try {
        const pricing = JSON.parse(model.pricingOptions);
        console.log(`   Parsed Pricing:`, pricing);
      } catch (e) {
        console.log(`   ❌ Failed to parse pricingOptions`);
      }
    }
  }
  
  console.log("\n=== End of Pricing Check ===");
  process.exit(0);
}

checkPricing().catch(console.error);

