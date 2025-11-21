import { getDb } from "./db";
import { verifiedCodes, codeRedemptions, users } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

/**
 * Verify a code and mark user as verified
 */
export async function verifyUserWithCode(userId: string, code: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Find the code
  const [foundCode] = await db
    .select()
    .from(verifiedCodes)
    .where(eq(verifiedCodes.code, code))
    .limit(1);

  if (!foundCode) {
    throw new Error("รหัสไม่ถูกต้อง");
  }

  if (!foundCode.isActive) {
    throw new Error("รหัสนี้ถูกปิดการใช้งานแล้ว");
  }

  // Check expiry
  if (foundCode.expiresAt && new Date(foundCode.expiresAt) < new Date()) {
    throw new Error("รหัสนี้หมดอายุแล้ว");
  }

  // Check usage limit
  if (foundCode.maxUses !== null && foundCode.usedCount >= foundCode.maxUses) {
    throw new Error("รหัสนี้ถูกใช้งานครบจำนวนแล้ว");
  }

  // Check if user already verified
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user.isVerified) {
    throw new Error("บัญชีของคุณได้รับการยืนยันแล้ว");
  }

  // Check if user already used this code
  const [existingRedemption] = await db
    .select()
    .from(codeRedemptions)
    .where(
      and(
        eq(codeRedemptions.userId, userId),
        eq(codeRedemptions.codeId, foundCode.id)
      )
    )
    .limit(1);

  if (existingRedemption) {
    throw new Error("คุณได้ใช้รหัสนี้ไปแล้ว");
  }

  // All checks passed - verify user
  await db.update(users).set({ isVerified: 1 as any }).where(eq(users.id, userId));

  // Record redemption
  await db.insert(codeRedemptions).values({
    id: nanoid(),
    userId,
    codeId: foundCode.id,
  });

  // Increment used count
  await db
    .update(verifiedCodes)
    .set({ usedCount: foundCode.usedCount + 1 })
    .where(eq(verifiedCodes.id, foundCode.id));

  return {
    success: true,
    message: "ยืนยันตัวตนสำเร็จ! ตอนนี้คุณสามารถใช้งานได้เต็มรูปแบบแล้ว",
  };
}

/**
 * Create a new verified code (admin only)
 */
export async function createVerifiedCode(params: {
  code: string;
  maxUses?: number | null;
  expiresAt?: Date | null;
  note?: string;
  createdBy: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const id = nanoid();

  await db.insert(verifiedCodes).values({
    id,
    code: params.code,
    maxUses: params.maxUses ?? null,
    usedCount: 0,
    isActive: 1 as any,
    note: params.note ?? null,
    createdBy: params.createdBy,
    expiresAt: params.expiresAt ?? null,
  });

  return { id, code: params.code };
}

/**
 * List all verified codes (admin only)
 */
export async function listVerifiedCodes() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.select().from(verifiedCodes).orderBy(desc(verifiedCodes.createdAt));
}

/**
 * Get code redemptions (admin only)
 */
export async function getCodeRedemptions(codeId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db
    .select({
      id: codeRedemptions.id,
      userId: codeRedemptions.userId,
      userName: users.name,
      userEmail: users.email,
      redeemedAt: codeRedemptions.redeemedAt,
    })
    .from(codeRedemptions)
    .leftJoin(users, eq(codeRedemptions.userId, users.id))
    .where(eq(codeRedemptions.codeId, codeId));
}

/**
 * Delete a verified code (admin only)
 */
export async function deleteVerifiedCode(codeId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(verifiedCodes).where(eq(verifiedCodes.id, codeId));
  return { success: true };
}

/**
 * Toggle code active status (admin only)
 */
export async function toggleCodeStatus(codeId: string, isActive: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const activeValue: number = isActive ? 1 : 0;
  await db
    .update(verifiedCodes)
    .set({ isActive: activeValue as any })
    .where(eq(verifiedCodes.id, codeId));
  return { success: true };
}

