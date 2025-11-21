import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { generations, creditTransactions, aiModels } from "../drizzle/schema";
import { nanoid } from "nanoid";

async function migrateTransactions() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const db = drizzle(process.env.DATABASE_URL);

  console.log("Starting transaction migration...");

  // Get all generations
  const allGenerations = await db.select().from(generations).orderBy(desc(generations.createdAt));
  console.log(`Found ${allGenerations.length} generations`);

  // Get all models for lookup
  const allModels = await db.select().from(aiModels);
  const modelMap = new Map(allModels.map(m => [m.id, m]));

  let migrated = 0;
  let skipped = 0;

  for (const generation of allGenerations) {
    // Check if transaction already exists
    const existing = await db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.relatedGenerationId, generation.id))
      .limit(1);

    if (existing.length > 0) {
      console.log(`Skipping generation ${generation.id} - transaction already exists`);
      skipped++;
      continue;
    }

    const model = modelMap.get(generation.modelId);
    if (!model) {
      console.warn(`Model not found for generation ${generation.id}, skipping`);
      skipped++;
      continue;
    }

    // Get user's current credit balance (we'll need to calculate it)
    // For simplicity, we'll use the creditsUsed as the transaction amount
    // and set balanceAfter to 0 (since we don't have historical balance data)
    
    const promptPreview = generation.prompt.substring(0, 50);
    const description = `Generated ${generation.type} with ${model.name}: ${promptPreview}${generation.prompt.length > 50 ? '...' : ''}`;

    // Create deduction transaction
    await db.insert(creditTransactions).values({
      id: nanoid(),
      userId: generation.userId,
      type: 'deduction',
      amount: Number(-generation.creditsUsed),
      balanceAfter: 0,
      description,
      relatedGenerationId: generation.id,
      createdAt: generation.createdAt || new Date(),
    } as any);

    migrated++;
    console.log(`Migrated generation ${generation.id} (${migrated}/${allGenerations.length})`);
  }

  console.log(`\nMigration complete!`);
  console.log(`Migrated: ${migrated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Total: ${allGenerations.length}`);

  process.exit(0);
}

migrateTransactions().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});

