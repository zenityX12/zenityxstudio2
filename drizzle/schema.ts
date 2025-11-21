import { mysqlEnum, mysqlTable, text, timestamp, varchar, int, boolean, decimal } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  username: varchar("username", { length: 64 }).unique(), // Unique username for user profile
  bio: text("bio"), // User bio/description
  phone: varchar("phone", { length: 20 }), // Phone number (optional)
  birthday: varchar("birthday", { length: 10 }), // Birthday in YYYY-MM-DD format
  profilePicture: text("profilePicture"), // Profile picture URL
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "sale"]).default("user").notNull(),
  isVerified: int("isVerified").default(1).notNull(), // 1 = verified, 0 = not verified
  preferences: text("preferences"), // JSON string for user preferences (theme, notifications, etc.)
  createdAt: timestamp("createdAt").defaultNow(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Credits table - track user credits
export const credits = mysqlTable("credits", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 1 }).notNull().default("0.0"),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export type Credit = typeof credits.$inferSelect;
export type InsertCredit = typeof credits.$inferInsert;

// Credit Transactions table - track all credit movements
export const creditTransactions = mysqlTable("creditTransactions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  type: mysqlEnum("type", ["deduction", "topup", "refund", "admin_adjustment"]).notNull(),
  amount: decimal("amount", { precision: 10, scale: 1 }).notNull(), // Positive for additions, negative for deductions
  balanceAfter: decimal("balanceAfter", { precision: 10, scale: 1 }).notNull(), // Credit balance after this transaction
  description: text("description").notNull(), // Description of the transaction
  relatedGenerationId: varchar("relatedGenerationId", { length: 64 }), // Link to generation if applicable
  relatedCodeId: varchar("relatedCodeId", { length: 64 }), // Link to invite code if applicable
  metadata: text("metadata"), // JSON metadata for additional info (e.g., chargeId, packageId)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type InsertCreditTransaction = typeof creditTransactions.$inferInsert;

// Invite codes table
export const inviteCodes = mysqlTable("inviteCodes", {
  id: varchar("id", { length: 64 }).primaryKey(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  credits: int("credits").notNull().default(100),
  maxUses: int("maxUses").notNull().default(1),
  usedCount: int("usedCount").notNull().default(0),
  isActive: int("isActive").notNull().default(1), // 1 = active, 0 = inactive
  note: text("note"), // Admin note for this code
  createdBy: varchar("createdBy", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  expiresAt: timestamp("expiresAt"),
});

export type InviteCode = typeof inviteCodes.$inferSelect;
export type InsertInviteCode = typeof inviteCodes.$inferInsert;

// Verified codes table - for student verification
export const verifiedCodes = mysqlTable("verifiedCodes", {
  id: varchar("id", { length: 64 }).primaryKey(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  maxUses: int("maxUses"), // null = unlimited
  usedCount: int("usedCount").notNull().default(0),
  isActive: int("isActive").notNull().default(1), // 1 = active, 0 = inactive
  note: text("note"), // Admin note for this code
  createdBy: varchar("createdBy", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  expiresAt: timestamp("expiresAt"),
});

export type VerifiedCode = typeof verifiedCodes.$inferSelect;
export type InsertVerifiedCode = typeof verifiedCodes.$inferInsert;

// Code redemptions table - track who used which verified code
export const codeRedemptions = mysqlTable("codeRedemptions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  codeId: varchar("codeId", { length: 64 }).notNull(),
  redeemedAt: timestamp("redeemedAt").defaultNow(),
});

export type CodeRedemption = typeof codeRedemptions.$inferSelect;
export type InsertCodeRedemption = typeof codeRedemptions.$inferInsert;

// AI Models table
export const aiModels = mysqlTable("aiModels", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["image", "video"]).notNull(),
  provider: varchar("provider", { length: 255 }).notNull(),
  modelId: varchar("modelId", { length: 255 }).notNull(),
  costPerGeneration: decimal("costPerGeneration", { precision: 10, scale: 1 }).notNull().default("10.0"),
  kiePrice: decimal("kiePrice", { precision: 10, scale: 1 }).notNull().default("0.0"), // Kie credit cost (for comparison, not charged to users)
  pricingOptions: text("pricingOptions"), // JSON string for duration-based pricing: {"10s": 60, "15s": 90}
  kiePricingOptions: text("kiePricingOptions"), // JSON string for Kie duration-based pricing: {"10s": 50, "15s": 80}
  isActive: int("isActive").notNull().default(1), // 1 = active, 0 = inactive
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow(),
});

export type AIModel = typeof aiModels.$inferSelect;
export type InsertAIModel = typeof aiModels.$inferInsert;

// Generations table - track all AI generations
export const generations = mysqlTable("generations", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  modelId: varchar("modelId", { length: 64 }).notNull(),
  type: mysqlEnum("type", ["image", "video"]).notNull(), // Store type to avoid JOIN with aiModels
  prompt: text("prompt").notNull(),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).notNull().default("pending"),
  taskId: text("taskId"),
  resultUrl: text("resultUrl"), // Single result URL (for backward compatibility)
  resultUrls: text("resultUrls"), // JSON array of result URLs (for batch generation)
  thumbnailUrl: text("thumbnailUrl"), // Thumbnail URL for video previews (generated by backend)
  parameters: text("parameters"), // JSON object of generation parameters
  errorMessage: text("errorMessage"),
  creditsUsed: decimal("creditsUsed", { precision: 10, scale: 1 }).notNull().default("0.0"),
  kieCreditsUsed: decimal("kieCreditsUsed", { precision: 10, scale: 1 }).notNull().default("0.0"), // Actual Kie credits used (for tracking/comparison)
  refunded: int("refunded").notNull().default(0), // 1 = refunded, 0 = not refunded
  isHidden: int("isHidden").notNull().default(0), // 1 = hidden, 0 = visible
  createdAt: timestamp("createdAt").defaultNow(),
  completedAt: timestamp("completedAt"),
});

export type Generation = typeof generations.$inferSelect;
export type InsertGeneration = typeof generations.$inferInsert;



// API Keys table - for admin to manage Kie API keys
export const apiKeys = mysqlTable("apiKeys", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  apiKey: text("apiKey").notNull(),
  isActive: int("isActive").notNull().default(1), // 1 = active, 0 = inactive
  monthlyBudget: int("monthlyBudget").notNull().default(0),
  currentSpend: int("currentSpend").notNull().default(0),
  lastResetAt: timestamp("lastResetAt").defaultNow(),
  createdAt: timestamp("createdAt").defaultNow(),
});

export type APIKey = typeof apiKeys.$inferSelect;
export type InsertAPIKey = typeof apiKeys.$inferInsert;

// Activity Logs table - track admin and sale actions
export const activityLogs = mysqlTable("activityLogs", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(), // Who performed the action
  userRole: mysqlEnum("userRole", ["admin", "sale"]).notNull(), // Role at the time of action
  action: varchar("action", { length: 64 }).notNull(), // e.g., "create_invite_code", "toggle_invite_status", "create_verified_code"
  targetType: varchar("targetType", { length: 64 }).notNull(), // e.g., "invite_code", "verified_code", "user"
  targetId: varchar("targetId", { length: 64 }), // ID of the affected resource
  details: text("details"), // JSON string with additional details
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = typeof activityLogs.$inferInsert;

// System Settings table - for storing system-wide configuration and API keys
export const systemSettings = mysqlTable("systemSettings", {
  id: varchar("id", { length: 64 }).primaryKey(),
  key: varchar("key", { length: 255 }).notNull().unique(), // e.g., "omise_public_key", "omise_secret_key"
  value: text("value").notNull(), // Encrypted value
  description: text("description"), // Human-readable description
  category: varchar("category", { length: 64 }).notNull(), // e.g., "payment", "email", "storage"
  isSecret: int("isSecret").notNull().default(1), // 1 = sensitive data (API keys), 0 = public config
  updatedBy: varchar("updatedBy", { length: 64 }), // User ID who last updated
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = typeof systemSettings.$inferInsert;

// Role Permissions table - define what each role can access and do
export const rolePermissions = mysqlTable("rolePermissions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  role: mysqlEnum("role", ["user", "admin", "sale"]).notNull().unique(),
  permissions: text("permissions").notNull(), // JSON string of permissions
  updatedBy: varchar("updatedBy", { length: 64 }), // User ID who last updated
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = typeof rolePermissions.$inferInsert;

