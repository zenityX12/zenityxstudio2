import { eq, and, gte, like, desc, sql, isNull, isNotNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, credits, creditTransactions, inviteCodes, aiModels, generations, apiKeys, InsertCredit, InsertCreditTransaction, InsertInviteCode, InsertAIModel, InsertGeneration, InsertAPIKey, verifiedCodes, InsertVerifiedCode } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && ENV.databaseUrl) {
    try {
      console.log("[Database] Initializing connection...");
      console.log("[Database] DATABASE_URL exists:", !!ENV.databaseUrl);
      console.log("[Database] DATABASE_URL length:", ENV.databaseUrl.length);
      _db = drizzle(ENV.databaseUrl);
      console.log("[Database] Connection initialized successfully");
    } catch (error) {
      console.error("[Database] Failed to connect:", error);
      console.error("[Database] DATABASE_URL:", ENV.databaseUrl.substring(0, 30) + "...");
      _db = null;
    }
  } else if (!ENV.databaseUrl) {
    console.error("[Database] DATABASE_URL is not set in environment");
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.id) {
    throw new Error("User ID is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    const error = new Error("Database connection not available. Please check DATABASE_URL configuration.");
    console.error("[Database] Cannot upsert user:", error.message);
    throw error;
  }

  try {
    const values: Partial<InsertUser> = {
      id: user.id,
    };
    const updateSet: Record<string, unknown> = {};

    // Handle all text fields that might be passed
    const textFields = ["name", "email", "loginMethod", "username", "bio", "phone", "birthday", "profilePicture", "preferences"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      (values as any)[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    // Handle lastSignedIn
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    
    // Set default lastSignedIn if not provided
    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }
    
    // Handle role
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.id === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    // Handle isVerified
    if (user.isVerified !== undefined) {
      values.isVerified = user.isVerified;
      updateSet.isVerified = user.isVerified;
    }

    // Handle createdAt (only for insert, not update)
    if (user.createdAt !== undefined) {
      values.createdAt = user.createdAt;
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values as InsertUser).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUser(id: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Alias for backward compatibility with Manus SDK
export async function getUserByOpenId(openId: string) {
  return getUser(openId);
}

// Credits functions
export async function getUserCredits(userId: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(credits).where(eq(credits.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function upsertUserCredits(userId: string, amount: number) {
  const db = await getDb();
  if (!db) return;
  const id = `credit_${userId}`;
  await db.insert(credits).values({ id, userId, amount: String(amount), updatedAt: new Date() })
    .onDuplicateKeyUpdate({ set: { amount: String(amount), updatedAt: new Date() } });
}

export async function deductCredits(userId: string, amount: number) {
  const db = await getDb();
  if (!db) return false;
  const userCredit = await getUserCredits(userId);
  // Convert DECIMAL to number to prevent string concatenation
  const currentAmount = userCredit ? (typeof userCredit.amount === 'string' ? parseFloat(userCredit.amount) : Number(userCredit.amount)) : 0;
  if (!userCredit || currentAmount < amount) return false;
  await upsertUserCredits(userId, currentAmount - amount);
  return true;
}

// Invite code functions
export async function getInviteCode(code: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(inviteCodes).where(eq(inviteCodes.code, code)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getAllInviteCodes() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(inviteCodes).orderBy(desc(inviteCodes.createdAt));
}

export async function createInviteCode(data: InsertInviteCode) {
  const db = await getDb();
  if (!db) return;
  await db.insert(inviteCodes).values(data);
}

export async function incrementInviteCodeUsage(code: string) {
  const db = await getDb();
  if (!db) return;
  const invite = await getInviteCode(code);
  if (!invite) return;
  await db.update(inviteCodes)
    .set({ usedCount: invite.usedCount + 1 })
    .where(eq(inviteCodes.code, code));
}

export async function getInviteCodeRedemptions(codeId: string) {
  const db = await getDb();
  if (!db) return [];
  
  // Get all transactions related to this invite code
  const transactions = await db
    .select({
      userId: creditTransactions.userId,
      createdAt: creditTransactions.createdAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(creditTransactions)
    .leftJoin(users, eq(creditTransactions.userId, users.id))
    .where(eq(creditTransactions.relatedCodeId, codeId))
    .orderBy(desc(creditTransactions.createdAt));
  
  return transactions;
}

export async function toggleInviteCodeStatus(id: string) {
  const db = await getDb();
  if (!db) return;
  
  const invite = await db.select().from(inviteCodes).where(eq(inviteCodes.id, id)).limit(1);
  if (invite.length === 0) return;
  
  await db.update(inviteCodes)
    .set({ isActive: (invite[0].isActive ? 0 : 1) as any })
    .where(eq(inviteCodes.id, id));
}

export async function deleteInviteCode(id: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(inviteCodes).where(eq(inviteCodes.id, id));
}

// AI Models functions
export async function getAllAIModels() {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select().from(aiModels).where(eq(aiModels.isActive, 1));
  console.log('[getAllAIModels] Found', result.length, 'active models');
  console.log('[getAllAIModels] First 3 models:', result.slice(0, 3).map(m => ({ id: m.id, name: m.name, type: m.type, isActive: m.isActive })));
  return result;
}

export async function getAIModel(identifier: string) {
  const db = await getDb();
  if (!db) return null;
  
  // Try modelId first (for Seedance: bytedance/v1-lite-text-to-video)
  let result = await db.select().from(aiModels).where(eq(aiModels.modelId, identifier)).limit(1);
  
  // Fallback to id if not found (for other models: sora-2-pro, veo-3-1-fast, etc.)
  if (result.length === 0) {
    result = await db.select().from(aiModels).where(eq(aiModels.id, identifier)).limit(1);
  }
  
  return result.length > 0 ? result[0] : null;
}

export async function createAIModel(data: InsertAIModel) {
  const db = await getDb();
  if (!db) return;
  await db.insert(aiModels).values(data);
}

export async function getAllAIModelsForAdmin() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(aiModels);
}

export async function updateAIModelPrice(id: string, costPerGeneration: number, pricingOptions?: string, kiePrice?: number, kiePricingOptions?: string) {
  const db = await getDb();
  if (!db) return;
  
  const updateData: any = { costPerGeneration };
  if (pricingOptions !== undefined) {
    updateData.pricingOptions = pricingOptions;
  }
  if (kiePrice !== undefined) {
    updateData.kiePrice = kiePrice;
  }
  if (kiePricingOptions !== undefined) {
    updateData.kiePricingOptions = kiePricingOptions;
  }
  
  await db.update(aiModels)
    .set(updateData)
    .where(eq(aiModels.id, id));
}

export async function toggleAIModelStatus(id: string, isActive: boolean) {
  const db = await getDb();
  if (!db) return;
  await db.update(aiModels)
    .set({ isActive: (isActive ? 1 : 0) as any })
    .where(eq(aiModels.id, id));
}

export async function deleteAIModel(id: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(aiModels).where(eq(aiModels.id, id));
}

export async function deleteAllAIModels() {
  const db = await getDb();
  if (!db) return;
  await db.delete(aiModels);
}

// Generations functions
export async function createGeneration(data: InsertGeneration) {
  const db = await getDb();
  if (!db) return;
  await db.insert(generations).values(data);
}

export async function getGeneration(id: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(generations).where(eq(generations.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

// Get user generations (excluding hidden ones for Studio/Gallery)
export async function getUserGenerations(userId: string, includeHidden: boolean = false) {
  const db = await getDb();
  if (!db) return [];
  
  if (includeHidden) {
    // For History page - show all generations including hidden
    return await db.select().from(generations).where(eq(generations.userId, userId)).orderBy(desc(generations.createdAt));
  } else {
    // For Studio/Gallery - exclude hidden generations
    const { and } = await import('drizzle-orm');
    return await db.select().from(generations)
      .where(and(eq(generations.userId, userId), eq(generations.isHidden, 0)))
      .orderBy(desc(generations.createdAt));
  }
}

export async function getProcessingGenerations() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(generations).where(eq(generations.status, "processing"));
}

export async function getAllGenerations() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(generations);
}

export async function updateGenerationWithTaskId(id: string, taskId: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(generations).set({ 
    status: "processing",
    taskId: taskId
  }).where(eq(generations.id, id));
}

export async function updateGenerationStatus(
  id: string, 
  status: "pending" | "processing" | "completed" | "failed", 
  resultUrl?: string, 
  errorMessage?: string,
  resultUrls?: string[] // Add resultUrls array parameter
) {
  const db = await getDb();
  if (!db) return;
  const updateData: any = { status };
  if (resultUrl) updateData.resultUrl = resultUrl;
  if (resultUrls) updateData.resultUrls = JSON.stringify(resultUrls); // Store as JSON string
  if (errorMessage) updateData.errorMessage = errorMessage;
  if (status === "completed" || status === "failed") updateData.completedAt = new Date();
  await db.update(generations).set(updateData).where(eq(generations.id, id));
}

// Soft delete - hide generation from Studio/Gallery but keep in History
export async function hideGeneration(id: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(generations).set({ isHidden: 1 }).where(eq(generations.id, id));
}

// Unhide generation
export async function unhideGeneration(id: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(generations).set({ isHidden: 0 }).where(eq(generations.id, id));
}

// Hard delete - permanently remove generation (use with caution)
export async function deleteGeneration(id: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(generations).where(eq(generations.id, id));
}

export async function updateGenerationFromWebhook(
  taskId: string,
  status: "completed" | "failed",
  resultUrl?: string,
  resultUrls?: string[],
  errorMessage?: string
) {
  console.log(`========== [updateGenerationFromWebhook] START ==========`);
  console.log(`[updateGenerationFromWebhook] taskId=${taskId}, status=${status}, resultUrl=${resultUrl ? 'exists' : 'missing'}`);
  
  const db = await getDb();
  if (!db) return;
  
  const updateData: any = { status };
  if (resultUrl) updateData.resultUrl = resultUrl;
  if (resultUrls && resultUrls.length > 0) {
    updateData.resultUrls = JSON.stringify(resultUrls);
    // Also set resultUrl to first image for backward compatibility
    if (!resultUrl) updateData.resultUrl = resultUrls[0];
  }
  if (errorMessage) updateData.errorMessage = errorMessage;
  updateData.completedAt = new Date();
  
  await db.update(generations).set(updateData).where(eq(generations.taskId, taskId));
  
  // Get generation ID to cancel polling
  const generation = await db.select().from(generations).where(eq(generations.taskId, taskId)).limit(1);
  if (generation.length > 0) {
    const gen = generation[0];
    
    // Cancel polling when webhook successfully updates status
    const { cancelPolling } = await import("./routers");
    cancelPolling(gen.id);
    
    // Automatic refund for failed generations
    if (status === "failed") {
      // Only refund if not already refunded
      if (!gen.refunded && Number(gen.creditsUsed) > 0) {
        await refundGeneration(gen.id);
        console.log(`[Auto-Refund] Refunded ${gen.creditsUsed} credits for failed generation ${gen.id}`);
      }
    }
    
    // Automatic thumbnail generation for completed videos
    console.log(`[Auto-Thumbnail] Checking video ${gen.id}: status=${status}, type=${gen.type}, resultUrl=${resultUrl ? 'exists' : 'missing'}`);
    if (status === "completed" && gen.type === "video" && resultUrl) {
      console.log(`[Auto-Thumbnail] Generating thumbnail for video ${gen.id}...`);
      try {
        const { generateVideoThumbnail } = await import("./thumbnailGenerator");
        await generateVideoThumbnail(resultUrl, gen.userId, gen.id);
        console.log(`[Auto-Thumbnail] Successfully generated thumbnail for video ${gen.id}`);
      } catch (error) {
        console.error(`[Auto-Thumbnail] Failed to generate thumbnail for video ${gen.id}:`, error);
        // Don't throw - thumbnail generation failure shouldn't affect video completion
      }
    } else {
      console.log(`[Auto-Thumbnail] Skipping thumbnail generation for ${gen.id}: conditions not met`);
    }
  }
}

// API Keys functions
export async function getAllAPIKeys() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(apiKeys);
}

export async function getActiveAPIKey() {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(apiKeys).where(eq(apiKeys.isActive, 1)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createAPIKey(data: InsertAPIKey) {
  const db = await getDb();
  if (!db) return;
  await db.insert(apiKeys).values(data);
}

export async function updateAPIKeySpend(id: string, amount: number) {
  const db = await getDb();
  if (!db) return;
  const key = await db.select().from(apiKeys).where(eq(apiKeys.id, id)).limit(1);
  if (key.length === 0) return;
  await db.update(apiKeys)
    .set({ currentSpend: key[0].currentSpend + amount })
    .where(eq(apiKeys.id, id));
}

// User management functions
export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(users);
}

export async function addCreditsToUser(userId: string, amount: number) {
  const db = await getDb();
  if (!db) return false;
  const userCredit = await getUserCredits(userId);
  if (userCredit) {
    // Convert DECIMAL to number to prevent string concatenation
    const currentAmount = typeof userCredit.amount === 'string' ? parseFloat(userCredit.amount) : Number(userCredit.amount);
    await upsertUserCredits(userId, currentAmount + amount);
  } else {
    await upsertUserCredits(userId, amount);
  }
  return true;
}

export async function setUserCredits(userId: string, amount: number) {
  const db = await getDb();
  if (!db) return false;
  await upsertUserCredits(userId, amount);
  return true;
}

export async function updateUserVerificationStatus(userId: string, isVerified: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(users)
    .set({ isVerified: isVerified ? 1 : 0 })
    .where(eq(users.id, userId));
  
  console.log(`[DB] Updated user ${userId} verification status to ${isVerified}`);
  return true;
}

export async function updateUserRole(userId: string, role: "user" | "admin" | "sale") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(users)
    .set({ role })
    .where(eq(users.id, userId));
  
  console.log(`[DB] Updated user ${userId} role to ${role}`);
  return true;
}

// Profile management functions
export async function getUserById(userId: string) {
  const db = await getDb();
  if (!db) return null;
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  return user || null;
}

export async function getUserByUsername(username: string) {
  const db = await getDb();
  if (!db) return null;
  const [user] = await db.select().from(users).where(eq(users.username, username));
  return user || null;
}

export async function updateUserProfile(
  userId: string,
  data: {
    name?: string;
    username?: string;
    bio?: string;
    phone?: string;
    birthday?: string;
    profilePicture?: string;
    preferences?: string;
  }
) {
  const db = await getDb();
  if (!db) return false;

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.username !== undefined) updateData.username = data.username;
  if (data.bio !== undefined) updateData.bio = data.bio;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.birthday !== undefined) updateData.birthday = data.birthday;
  if (data.profilePicture !== undefined) updateData.profilePicture = data.profilePicture;
  if (data.preferences !== undefined) updateData.preferences = data.preferences;

  await db.update(users).set(updateData).where(eq(users.id, userId));
  return true;
}



// Credit Transactions functions
export async function createCreditTransaction(data: InsertCreditTransaction) {
  const db = await getDb();
  if (!db) return;
  await db.insert(creditTransactions).values(data);
}

export async function getUserCreditTransactions(userId: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(creditTransactions).where(eq(creditTransactions.userId, userId)).orderBy(desc(creditTransactions.createdAt));
}

// Get user credit statistics (total added and used)
export async function getUserCreditStats(userId: string): Promise<{ creditsAdded: number; creditsUsed: number }> {
  const db = await getDb();
  if (!db) return { creditsAdded: 0, creditsUsed: 0 };
  
  const transactions = await db.select().from(creditTransactions).where(eq(creditTransactions.userId, userId));
  
  let creditsAdded = 0;
  let creditsUsed = 0;
  
  for (const tx of transactions) {
    // Convert decimal string to number to avoid concatenation issues
    const amount = typeof tx.amount === 'string' ? parseFloat(tx.amount) : Number(tx.amount);
    
    if (tx.type === 'topup' || tx.type === 'refund' || tx.type === 'admin_adjustment') {
      if (amount > 0) {
        creditsAdded += amount;
      }
    } else if (tx.type === 'deduction') {
      creditsUsed += Math.abs(amount);
    }
  }
  
  return { creditsAdded, creditsUsed };
}

// Enhanced credit deduction with transaction tracking
export async function deductCreditsWithTransaction(
  userId: string, 
  amount: number, 
  description: string,
  relatedGenerationId?: string
) {
  const db = await getDb();
  if (!db) return false;
  
  const userCredit = await getUserCredits(userId);
  // Convert decimal to number to avoid string concatenation
  const currentBalance = userCredit ? (typeof userCredit.amount === 'string' ? parseFloat(userCredit.amount) : Number(userCredit.amount)) : 0;
  const amountNum = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  
  if (!userCredit || currentBalance < amountNum) return false;
  
  const newBalance = currentBalance - amountNum;
  await upsertUserCredits(userId, newBalance);
  
  // Create transaction record
  const { nanoid } = await import('nanoid');
  await createCreditTransaction({
    id: nanoid(),
    userId,
    type: 'deduction',
    amount: String(-amount),
    balanceAfter: String(newBalance),
    description,
    relatedGenerationId,
    createdAt: new Date(),
  });
  
  return true;
}

// Add credits with transaction tracking (for top-ups and refunds)
export async function addCreditsWithTransaction(
  userId: string,
  amount: number,
  type: 'topup' | 'refund' | 'admin_adjustment',
  description: string,
  metadata?: Record<string, any>,
  relatedGenerationId?: string,
  relatedCodeId?: string
) {
  const db = await getDb();
  if (!db) return false;
  
  const userCredit = await getUserCredits(userId);
  // Convert decimal to number to avoid string concatenation
  const currentBalance = userCredit ? (typeof userCredit.amount === 'string' ? parseFloat(userCredit.amount) : Number(userCredit.amount)) : 0;
  const amountNum = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  const newBalance = currentBalance + amountNum;
  
  await upsertUserCredits(userId, newBalance);
  
  // Create transaction record
  const { nanoid } = await import('nanoid');
  await createCreditTransaction({
    id: nanoid(),
    userId,
    type,
    amount: String(amount),
    balanceAfter: String(newBalance),
    description,
    metadata: metadata ? JSON.stringify(metadata) : null,
    relatedGenerationId,
    relatedCodeId,
    createdAt: new Date(),
  });
  
  return true;
}

// Refund credits for a failed generation
export async function refundGeneration(generationId: string) {
  const db = await getDb();
  if (!db) return { success: false, message: 'Database not available' };
  
  const generation = await getGeneration(generationId);
  if (!generation) {
    return { success: false, message: 'Generation not found' };
  }
  
  if (generation.status !== 'failed') {
    return { success: false, message: 'Only failed generations can be refunded' };
  }
  
  if (generation.refunded) {
    return { success: false, message: 'Generation already refunded' };
  }
  
  // Refund the user credits
  await addCreditsWithTransaction(
    generation.userId,
    Number(generation.creditsUsed),
    'refund',
    `Refund for failed generation: ${generation.prompt.substring(0, 50)}...`,
    undefined, // metadata
    generationId, // relatedGenerationId
    undefined  // relatedCodeId
  );
  
  // Refund Kie Credits by resetting kieCreditsUsed to 0
  // This ensures the failed generation doesn't count towards Kie credit usage
  await db.update(generations)
    .set({ 
      refunded: 1,
      kieCreditsUsed: '0' // Reset Kie credits used to 0 for failed generation
    })
    .where(eq(generations.id, generationId));
  
  console.log(`[Refund] Refunded ${generation.creditsUsed} user credits and ${generation.kieCreditsUsed} Kie credits for generation ${generationId}`);
  
  return { success: true, message: 'Credits refunded successfully' };
}



// ==================== Kie API Integration ====================

/**
 * Get active Kie API key from database
 */
export async function getActiveKieApiKey(): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  
  const activeKeys = await db.select()
    .from(apiKeys)
    .where(eq(apiKeys.isActive, 1))
    .limit(1);
  
  return activeKeys.length > 0 ? activeKeys[0].apiKey : null;
}

/**
 * Fetch remaining credits from Kie API
 * API Documentation: https://api.kie.ai/api/v1/chat/credit
 */
export async function getKieRemainingCredits(): Promise<{
  success: boolean;
  credits?: number;
  error?: string;
}> {
  try {
    const apiKey = await getActiveKieApiKey();
    
    if (!apiKey) {
      return { success: false, error: 'No active Kie API key found' };
    }
    
    const response = await fetch('https://api.kie.ai/api/v1/chat/credit', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      return { 
        success: false, 
        error: `Kie API error: ${response.status} ${response.statusText}` 
      };
    }
    
    const data = await response.json();
    
    // Kie API response format: { code: 200, msg: "success", data: 100 }
    if (data.code === 200 && typeof data.data === 'number') {
      return { success: true, credits: data.data };
    } else {
      return { 
        success: false, 
        error: data.msg || 'Unknown error from Kie API' 
      };
    }
  } catch (error) {
    console.error('[Kie API] Error fetching credits:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}



/**
 * Get Kie credit usage logs with user and model information
 * @param limit - Number of records to return (default: 100)
 * @param startDate - Optional start date filter
 * @param endDate - Optional end date filter
 */
export async function getKieCreditUsageLogs(
  limit: number = 100,
  startDate?: Date,
  endDate?: Date
): Promise<Array<{
  id: string;
  username: string;
  modelName: string;
  userCredits: number;
  kieCredits: number;
  createdAt: Date;
  status: string;
}>> {
  const db = await getDb();
  if (!db) return [];
  
  // Build query with optional date filters
  let query = db.select({
    id: generations.id,
    userId: generations.userId,
    modelId: generations.modelId,
    userCredits: generations.creditsUsed,
    kieCredits: generations.kieCreditsUsed,
    createdAt: generations.createdAt,
    status: generations.status,
  })
  .from(generations)
  .orderBy(desc(generations.createdAt))
  .limit(limit);
  
  const results = await query;
  
  // Fetch user and model information for each generation
  const logsWithDetails = await Promise.all(
    results.map(async (gen) => {
      const user = await db.select({ username: users.username, name: users.name })
        .from(users)
        .where(eq(users.id, gen.userId))
        .limit(1);
      
      // Support both id and modelId lookup (backward compatibility)
      let model = await db.select({ name: aiModels.name })
        .from(aiModels)
        .where(eq(aiModels.id, gen.modelId))
        .limit(1);
      
      // Fallback: try modelId if not found by id (for Seedance models)
      if (!model || model.length === 0) {
        model = await db.select({ name: aiModels.name })
          .from(aiModels)
          .where(eq(aiModels.modelId, gen.modelId))
          .limit(1);
      }
      
      return {
        id: gen.id,
        username: user[0]?.username || user[0]?.name || 'Unknown',
        modelName: model[0]?.name || 'Unknown Model',
        userCredits: Number(gen.userCredits),
        kieCredits: Number(gen.kieCredits),
        createdAt: gen.createdAt || new Date(),
        status: gen.status,
      };
    })
  );
  
  return logsWithDetails;
}

/**
 * Get Kie credit usage statistics (daily/monthly aggregation)
 */
export async function getKieCreditUsageStats(period: 'daily' | 'monthly', days: number = 30): Promise<Array<{
  date: string;
  userCredits: number;
  kieCredits: number;
  count: number;
}>> {
  const db = await getDb();
  if (!db) return [];
  
  // Calculate start date
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  // Fetch all generations within the period
  const results = await db.select({
    userCredits: generations.creditsUsed,
    kieCredits: generations.kieCreditsUsed,
    createdAt: generations.createdAt,
  })
  .from(generations)
  .where(gte(generations.createdAt, startDate))
  .orderBy(desc(generations.createdAt));
  
  // Group by date
  const grouped = new Map<string, { userCredits: number; kieCredits: number; count: number }>();
  
  results.forEach((gen) => {
    if (!gen.createdAt) return;
    
    const date = period === 'daily'
      ? gen.createdAt.toISOString().split('T')[0] // YYYY-MM-DD
      : gen.createdAt.toISOString().substring(0, 7); // YYYY-MM
    
    const existing = grouped.get(date) || { userCredits: 0, kieCredits: 0, count: 0 };
    grouped.set(date, {
      userCredits: existing.userCredits + Number(gen.userCredits || 0),
      kieCredits: existing.kieCredits + Number(gen.kieCredits || 0),
      count: existing.count + 1,
    });
  });
  
  // Convert to array and sort by date
  return Array.from(grouped.entries())
    .map(([date, stats]) => ({ date, ...stats }))
    .sort((a, b) => a.date.localeCompare(b.date));
}



/**
 * Add credits to user account (for top-up)
 */
export async function addUserCredits(userId: string, amount: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [userCredit] = await db
    .select()
    .from(credits)
    .where(eq(credits.userId, userId))
    .limit(1);

  if (userCredit) {
    // Update existing credits
    await db
      .update(credits)
      .set({
        amount: sql`${credits.amount} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(credits.userId, userId));
  } else {
    // Create new credits record
    const { nanoid } = await import('nanoid');
    await db.insert(credits).values({
      id: nanoid(),
      userId,
      amount: String(amount),
      updatedAt: new Date(),
    });
  }
  
  console.log(`[DB] Added ${amount} credits to user ${userId}`);
}

/**
 * Record credit transaction (for history tracking)
 */
export async function recordCreditTransaction(transaction: {
  userId: string;
  amount: number;
  type: "topup" | "deduction" | "refund" | "admin_adjustment";
  description: string;
  metadata?: Record<string, any>;
  relatedGenerationId?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { nanoid } = await import('nanoid');
  
  // Get current balance
  const userCredit = await getUserCredits(transaction.userId);
  const currentBalance = userCredit ? Number(userCredit.amount) : 0;
  const newBalance = currentBalance + transaction.amount;
  
  await db.insert(creditTransactions).values({
    id: nanoid(),
    userId: transaction.userId,
    amount: String(transaction.amount),
    balanceAfter: String(newBalance),
    type: transaction.type,
    description: transaction.description,
    metadata: transaction.metadata ? JSON.stringify(transaction.metadata) : null,
    relatedGenerationId: transaction.relatedGenerationId,
    createdAt: new Date(),
  });
  
  console.log(`[DB] Recorded ${transaction.type} transaction: ${transaction.amount} credits for user ${transaction.userId}`);
}



// ==================== Dashboard Statistics ====================

/**
 * Get dashboard overview statistics for today
 */
export async function getDashboardOverview() {
  const db = await getDb();
  if (!db) return null;

  // New members today (Thailand timezone UTC+7)
  const [newMembersRows] = await db.execute(sql`SELECT COUNT(*) as count FROM users WHERE DATE(CONVERT_TZ(createdAt, '+00:00', '+07:00')) = DATE(CONVERT_TZ(NOW(), '+00:00', '+07:00'))`) as any;
  const newMembersToday = Number(newMembersRows[0]?.count || 0);

  // Code redemptions today (Thailand timezone UTC+7)
  const [redemptionsRows] = await db.execute(sql`SELECT COUNT(*) as count FROM creditTransactions WHERE DATE(CONVERT_TZ(createdAt, '+00:00', '+07:00')) = DATE(CONVERT_TZ(NOW(), '+00:00', '+07:00')) AND description LIKE '%Invite code%'`) as any;
  const redemptionsToday = Number(redemptionsRows[0]?.count || 0);

  // Verifications today (users who became verified today) (Thailand timezone UTC+7)
  const [verificationsRows] = await db.execute(sql`SELECT COUNT(*) as count FROM users WHERE isVerified = 1 AND DATE(CONVERT_TZ(lastSignedIn, '+00:00', '+07:00')) = DATE(CONVERT_TZ(NOW(), '+00:00', '+07:00'))`) as any;
  const verificationsToday = Number(verificationsRows[0]?.count || 0);

  // Credit purchases today (topups) (Thailand timezone UTC+7)
  // Count all topup transactions regardless of description
  const [topupsRows] = await db.execute(sql`SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM creditTransactions WHERE DATE(CONVERT_TZ(createdAt, '+00:00', '+07:00')) = DATE(CONVERT_TZ(NOW(), '+00:00', '+07:00')) AND type = 'topup'`) as any;
  const topupsToday = Number(topupsRows[0]?.count || 0);
  const topupCreditsToday = Number(topupsRows[0]?.total || 0);

  // Total credits sold (all time topups)
  const [totalCreditsSoldRows] = await db.execute(sql`SELECT COALESCE(SUM(amount), 0) as total FROM creditTransactions WHERE type = 'topup'`) as any;
  const totalCreditsSold = Number(totalCreditsSoldRows[0]?.total || 0);

  // Total credits used (all time spend/deduction transactions)
  const [totalCreditsUsedRows] = await db.execute(sql`SELECT COALESCE(SUM(ABS(amount)), 0) as total FROM creditTransactions WHERE type IN ('spend', 'deduction')`) as any;
  const totalCreditsUsed = Number(totalCreditsUsedRows[0]?.total || 0);

  // Remaining credits in system (sum of all user balances)
  const [remainingCreditsRows] = await db.execute(sql`SELECT COALESCE(SUM(amount), 0) as total FROM credits`) as any;
  const remainingCredits = Number(remainingCreditsRows[0]?.total || 0);

  return {
    newMembersToday,
    redemptionsToday,
    verificationsToday,
    topupsToday,
    topupCreditsToday,
    totalCreditsSold,
    totalCreditsUsed,
    remainingCredits,
  };
}

/**
 * Get AI usage statistics for today
 */
export async function getAIUsageStats() {
  const db = await getDb();
  if (!db) return null;

  // Images generated today (Thailand timezone UTC+7)
  const [imagesRows] = await db.execute(sql`SELECT COUNT(*) as count FROM generations WHERE type = 'image' AND status = 'completed' AND DATE(CONVERT_TZ(createdAt, '+00:00', '+07:00')) = DATE(CONVERT_TZ(NOW(), '+00:00', '+07:00'))`) as any;
  const imagesToday = Number(imagesRows[0]?.count || 0);

  // Videos generated today (Thailand timezone UTC+7)
  const [videosRows] = await db.execute(sql`SELECT COUNT(*) as count FROM generations WHERE type = 'video' AND status = 'completed' AND DATE(CONVERT_TZ(createdAt, '+00:00', '+07:00')) = DATE(CONVERT_TZ(NOW(), '+00:00', '+07:00'))`) as any;
  const videosToday = Number(videosRows[0]?.count || 0);

  // Active users today (users who generated something) (Thailand timezone UTC+7)
  const [activeUsersRows] = await db.execute(sql`SELECT COUNT(DISTINCT userId) as count FROM generations WHERE DATE(CONVERT_TZ(createdAt, '+00:00', '+07:00')) = DATE(CONVERT_TZ(NOW(), '+00:00', '+07:00'))`) as any;
  const activeUsersToday = Number(activeUsersRows[0]?.count || 0);

  // Most popular model today (Thailand timezone UTC+7)
  const [popularModelRows] = await db.execute(sql`
    SELECT g.modelId, m.name, COUNT(*) as count 
    FROM generations g
    LEFT JOIN aiModels m ON g.modelId = m.id
    WHERE g.status = 'completed' AND DATE(CONVERT_TZ(g.createdAt, '+00:00', '+07:00')) = DATE(CONVERT_TZ(NOW(), '+00:00', '+07:00'))
    GROUP BY g.modelId, m.name
    ORDER BY count DESC
    LIMIT 1
  `) as any;
  
  const popularModelName = popularModelRows[0]?.name || 'N/A';
  const popularModelCount = Number(popularModelRows[0]?.count || 0);

  return {
    imagesToday,
    videosToday,
    activeUsersToday,
    popularModel: popularModelName,
    popularModelCount,
  };
}

/**
 * Get trend data for the last 30 days
 */
export async function getTrendData() {
  const db = await getDb();
  if (!db) return null;

  // TODO: Fix GROUP BY DATE() syntax for MySQL
  // For now, return empty arrays to unblock dashboard
  return {
    membersTrend: [],
    topupTrend: [],
    aiUsageTrend: []
  };
}

/**
 * Get resource usage statistics
 */
export async function getResourceStats() {
  const db = await getDb();
  if (!db) return null;

  // Total generations count
  const [totalGenerationsRows] = await db.execute(sql`SELECT COUNT(*) as count FROM generations`) as any;
  const totalGenerations = Number(totalGenerationsRows[0]?.count || 0);

  // Completed generations count
  const [completedGenerationsRows] = await db.execute(sql`SELECT COUNT(*) as count FROM generations WHERE status = 'completed'`) as any;
  const completedGenerations = Number(completedGenerationsRows[0]?.count || 0);

  // Total users count
  const [totalUsersRows] = await db.execute(sql`SELECT COUNT(*) as count FROM users`) as any;
  const totalUsers = Number(totalUsersRows[0]?.count || 0);

  // Verified users count
  const [verifiedUsersRows] = await db.execute(sql`SELECT COUNT(*) as count FROM users WHERE isVerified = 1`) as any;
  const verifiedUsers = Number(verifiedUsersRows[0]?.count || 0);

  return {
    totalGenerations,
    completedGenerations,
    totalUsers,
    verifiedUsers,
  };
}




// ==================== Sales Statistics ====================

/**
 * Get sales statistics
 * @param period - 'today' | 'week' | 'month' | 'all'
 */
export async function getSalesStatistics(period: 'today' | 'week' | 'month' | 'all' = 'all') {
  const db = await getDb();
  if (!db) return null;

  let dateCondition = '';
  
  switch (period) {
    case 'today':
      dateCondition = `DATE(CONVERT_TZ(createdAt, '+00:00', '+07:00')) = DATE(CONVERT_TZ(NOW(), '+00:00', '+07:00'))`;
      break;
    case 'week':
      dateCondition = `CONVERT_TZ(createdAt, '+00:00', '+07:00') >= DATE_SUB(CONVERT_TZ(NOW(), '+00:00', '+07:00'), INTERVAL 7 DAY)`;
      break;
    case 'month':
      dateCondition = `YEAR(CONVERT_TZ(createdAt, '+00:00', '+07:00')) = YEAR(CONVERT_TZ(NOW(), '+00:00', '+07:00')) AND MONTH(CONVERT_TZ(createdAt, '+00:00', '+07:00')) = MONTH(CONVERT_TZ(NOW(), '+00:00', '+07:00'))`;
      break;
    case 'all':
    default:
      dateCondition = '1=1'; // Always true
      break;
  }

  // Get topup statistics
  const query = `
    SELECT 
      COUNT(*) as totalTransactions,
      COUNT(DISTINCT userId) as uniqueCustomers,
      COALESCE(SUM(amount), 0) as totalCredits,
      COALESCE(SUM(
        CASE 
          WHEN JSON_EXTRACT(metadata, '$.amountPaid') IS NOT NULL 
          THEN CAST(JSON_EXTRACT(metadata, '$.amountPaid') AS DECIMAL(10,2))
          ELSE 0
        END
      ), 0) as totalRevenue
    FROM creditTransactions 
    WHERE type = 'topup' AND ${dateCondition}
  `;
  const [statsRows] = await db.execute(sql.raw(query)) as any;

  const stats = statsRows[0] || {};

  return {
    totalTransactions: Number(stats.totalTransactions || 0),
    uniqueCustomers: Number(stats.uniqueCustomers || 0),
    totalCredits: Number(stats.totalCredits || 0),
    totalRevenue: Number(stats.totalRevenue || 0),
  };
}

/**
 * Get sales transactions with user details
 * @param options - Filter and pagination options
 */
export async function getSalesTransactions(options: {
  period?: 'today' | 'week' | 'month' | 'all';
  search?: string;
  limit?: number;
  offset?: number;
} = {}) {
  const db = await getDb();
  if (!db) return { transactions: [], total: 0 };

  const { period = 'all', search = '', limit = 50, offset = 0 } = options;

  let dateCondition = '';
  
  switch (period) {
    case 'today':
      dateCondition = `AND DATE(CONVERT_TZ(ct.createdAt, '+00:00', '+07:00')) = DATE(CONVERT_TZ(NOW(), '+00:00', '+07:00'))`;
      break;
    case 'week':
      dateCondition = `AND CONVERT_TZ(ct.createdAt, '+00:00', '+07:00') >= DATE_SUB(CONVERT_TZ(NOW(), '+00:00', '+07:00'), INTERVAL 7 DAY)`;
      break;
    case 'month':
      dateCondition = `AND YEAR(CONVERT_TZ(ct.createdAt, '+00:00', '+07:00')) = YEAR(CONVERT_TZ(NOW(), '+00:00', '+07:00')) AND MONTH(CONVERT_TZ(ct.createdAt, '+00:00', '+07:00')) = MONTH(CONVERT_TZ(NOW(), '+00:00', '+07:00'))`;
      break;
    case 'all':
    default:
      dateCondition = '';
      break;
  }

  let searchCondition = '';
  if (search) {
    searchCondition = `AND (u.name LIKE '%${search}%' OR u.email LIKE '%${search}%')`;
  }

  // Get transactions with user details
  const transactionsQuery = `
    SELECT 
      ct.id,
      ct.userId,
      ct.amount as credits,
      ct.description,
      ct.metadata,
      CONVERT_TZ(ct.createdAt, '+00:00', '+07:00') as createdAt,
      u.name as userName,
      u.email as userEmail,
      CASE 
        WHEN JSON_EXTRACT(ct.metadata, '$.amountPaid') IS NOT NULL 
        THEN CAST(JSON_EXTRACT(ct.metadata, '$.amountPaid') AS DECIMAL(10,2))
        ELSE 0
      END as amountPaid,
      JSON_EXTRACT(ct.metadata, '$.packageId') as packageId,
      JSON_EXTRACT(ct.metadata, '$.chargeId') as chargeId
    FROM creditTransactions ct
    LEFT JOIN users u ON ct.userId = u.id
    WHERE ct.type = 'topup' ${dateCondition} ${searchCondition}
    ORDER BY ct.createdAt DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  const [transactionsRows] = await db.execute(sql.raw(transactionsQuery)) as any;

  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total
    FROM creditTransactions ct
    LEFT JOIN users u ON ct.userId = u.id
    WHERE ct.type = 'topup' ${dateCondition} ${searchCondition}
  `;
  const [countRows] = await db.execute(sql.raw(countQuery)) as any;

  const total = Number(countRows[0]?.total || 0);

  // Parse metadata JSON strings
  const transactions = transactionsRows.map((row: any) => {
    let metadata = {};
    try {
      if (typeof row.metadata === 'string') {
        metadata = JSON.parse(row.metadata);
      } else {
        metadata = row.metadata || {};
      }
    } catch (e) {
      console.error('Failed to parse metadata:', e);
    }

    // Extract values from metadata or row
    const packageId = row.packageId ? String(row.packageId).replace(/"/g, '') : (metadata as any).packageId || '';
    const chargeId = row.chargeId ? String(row.chargeId).replace(/"/g, '') : (metadata as any).chargeId || '';

    return {
      id: row.id,
      userId: row.userId,
      userName: row.userName || 'Unknown',
      userEmail: row.userEmail || '',
      credits: Number(row.credits || 0),
      amountPaid: Number(row.amountPaid || 0),
      packageId,
      chargeId,
      description: row.description || '',
      createdAt: row.createdAt,
    };
  });

  return { transactions, total };
}




// ==================== Thumbnail Functions ====================

/**
 * Update generation thumbnail URL
 */
export async function updateGenerationThumbnail(id: string, thumbnailUrl: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(generations).set({ thumbnailUrl }).where(eq(generations.id, id));
}

/**
 * Get videos without thumbnails (for batch generation)
 */
export async function getVideosWithoutThumbnails(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(generations)
    .where(and(
      eq(generations.type, "video"),
      eq(generations.status, "completed"),
      isNull(generations.thumbnailUrl)
    ))
    .limit(limit);
}

/**
 * Count total generations by type
 */
export async function countGenerationsByType(type: "image" | "video") {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(generations)
    .where(and(
      eq(generations.type, type),
      eq(generations.status, "completed")
    ));
  
  return result[0]?.count || 0;
}

/**
 * Count videos with thumbnails
 */
export async function countVideosWithThumbnails() {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(generations)
    .where(and(
      eq(generations.type, "video"),
      eq(generations.status, "completed"),
      isNotNull(generations.thumbnailUrl)
    ));
  
  return result[0]?.count || 0;
}

