import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { systemSettings, type InsertSystemSetting } from "../drizzle/schema";
import { nanoid } from "nanoid";

/**
 * Get a system setting by key
 */
export async function getSystemSetting(key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[SystemSettings] Database not available");
    return null;
  }

  try {
    const result = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, key))
      .limit(1);

    return result.length > 0 ? result[0].value : null;
  } catch (error) {
    console.error(`[SystemSettings] Failed to get setting "${key}":`, error);
    return null;
  }
}

/**
 * Get all system settings (admin only)
 */
export async function getAllSystemSettings() {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return await db.select().from(systemSettings);
}

/**
 * Set or update a system setting
 */
export async function setSystemSetting(
  key: string,
  value: string,
  description?: string,
  category: string = "general",
  isSecret: number = 1,
  updatedBy?: string
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    // Check if setting exists
    const existing = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, key))
      .limit(1);

    if (existing.length > 0) {
      // Update existing setting
      await db
        .update(systemSettings)
        .set({
          value,
          description,
          category,
          isSecret,
          updatedBy,
          updatedAt: new Date(),
        })
        .where(eq(systemSettings.key, key));
    } else {
      // Insert new setting
      const newSetting: InsertSystemSetting = {
        id: nanoid(),
        key,
        value,
        description,
        category,
        isSecret,
        updatedBy,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await db.insert(systemSettings).values(newSetting);
    }

    console.log(`[SystemSettings] Setting "${key}" updated successfully`);
  } catch (error) {
    console.error(`[SystemSettings] Failed to set setting "${key}":`, error);
    throw error;
  }
}

/**
 * Delete a system setting
 */
export async function deleteSystemSetting(key: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.delete(systemSettings).where(eq(systemSettings.key, key));
  console.log(`[SystemSettings] Setting "${key}" deleted successfully`);
}

/**
 * Get Omise API keys from database
 */
export async function getOmiseKeys(): Promise<{
  publicKey: string | null;
  secretKey: string | null;
}> {
  const publicKey = await getSystemSetting("omise_public_key");
  const secretKey = await getSystemSetting("omise_secret_key");

  return { publicKey, secretKey };
}

