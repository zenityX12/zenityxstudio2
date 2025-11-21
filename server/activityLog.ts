import { getDb } from "./db";
import { activityLogs } from "../drizzle/schema";
import { nanoid } from "nanoid";
import { desc, eq } from "drizzle-orm";

export type ActivityAction =
  | "create_invite_code"
  | "toggle_invite_status"
  | "delete_invite_code"
  | "create_verified_code"
  | "delete_verified_code"
  | "update_user_role"
  | "add_user_credits"
  | "set_user_credits";

export type ActivityTargetType = "invite_code" | "verified_code" | "user" | "credits";

interface LogActivityParams {
  userId: string;
  userRole: "admin" | "sale";
  action: ActivityAction;
  targetType: ActivityTargetType;
  targetId?: string;
  details?: Record<string, any>;
}

/**
 * Log an activity performed by admin or sale role
 */
export async function logActivity(params: LogActivityParams) {
  const db = await getDb();
  if (!db) {
    console.warn("[ActivityLog] Database not available, skipping log");
    return;
  }

  try {
    await db.insert(activityLogs).values({
      id: `log_${nanoid()}`,
      userId: params.userId,
      userRole: params.userRole,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId || null,
      details: params.details ? JSON.stringify(params.details) : null,
    });
  } catch (error) {
    console.error("[ActivityLog] Failed to log activity:", error);
  }
}

/**
 * Get activity logs with optional filters
 */
export async function getActivityLogs(options?: {
  userId?: string;
  action?: ActivityAction;
  targetType?: ActivityTargetType;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let query = db.select().from(activityLogs);

  // Apply filters if provided
  if (options?.userId) {
    query = query.where(eq(activityLogs.userId, options.userId)) as any;
  }
  if (options?.action) {
    query = query.where(eq(activityLogs.action, options.action)) as any;
  }
  if (options?.targetType) {
    query = query.where(eq(activityLogs.targetType, options.targetType)) as any;
  }

  // Order by newest first and limit
  const logs = await query.orderBy(desc(activityLogs.createdAt)).limit(options?.limit || 100);

  return logs;
}

/**
 * Get recent activity logs (last 100)
 */
export async function getRecentActivityLogs() {
  return await getActivityLogs({ limit: 100 });
}

