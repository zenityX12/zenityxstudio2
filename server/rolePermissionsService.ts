import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { rolePermissions, type RolePermission } from "../drizzle/schema";
import { nanoid } from "nanoid";

export interface Permissions {
  tabs: string[]; // List of tabs user can access in Admin Dashboard
  canDelete: boolean; // Can delete records
  canEdit: boolean; // Can edit records
  canCreate: boolean; // Can create new records
}

/**
 * Get permissions for a specific role
 */
export async function getRolePermissions(role: "user" | "admin" | "sale"): Promise<Permissions | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[RolePermissions] Database not available");
    return getDefaultPermissions(role);
  }

  try {
    const result = await db
      .select()
      .from(rolePermissions)
      .where(eq(rolePermissions.role, role))
      .limit(1);

    if (result.length === 0) {
      return getDefaultPermissions(role);
    }

    return JSON.parse(result[0].permissions) as Permissions;
  } catch (error) {
    console.error("[RolePermissions] Error fetching permissions:", error);
    return getDefaultPermissions(role);
  }
}

/**
 * Get all role permissions
 */
export async function getAllRolePermissions(): Promise<RolePermission[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(rolePermissions);
}

/**
 * Update permissions for a role
 */
export async function updateRolePermissions(
  role: "user" | "admin" | "sale",
  permissions: Permissions,
  updatedBy: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const permissionsJson = JSON.stringify(permissions);

  // Check if role permissions exist
  const existing = await db
    .select()
    .from(rolePermissions)
    .where(eq(rolePermissions.role, role))
    .limit(1);

  if (existing.length > 0) {
    // Update existing
    await db
      .update(rolePermissions)
      .set({
        permissions: permissionsJson,
        updatedBy,
        updatedAt: new Date(),
      })
      .where(eq(rolePermissions.role, role));
  } else {
    // Insert new
    await db.insert(rolePermissions).values({
      id: `role_${role}_${nanoid(10)}`,
      role,
      permissions: permissionsJson,
      updatedBy,
      updatedAt: new Date(),
    });
  }
}

/**
 * Get default permissions for a role (fallback)
 */
function getDefaultPermissions(role: "user" | "admin" | "sale"): Permissions {
  switch (role) {
    case "admin":
      return {
        tabs: ["dashboard", "sales", "users", "inviteCodes", "apiKeys", "models", "kie", "verifiedCodes", "thumbnails", "activity", "systemSettings", "roleManagement"],
        canDelete: true,
        canEdit: true,
        canCreate: true,
      };
    case "sale":
      return {
        tabs: ["verifiedCodes"],
        canDelete: false,
        canEdit: true,
        canCreate: true,
      };
    case "user":
    default:
      return {
        tabs: [],
        canDelete: false,
        canEdit: false,
        canCreate: false,
      };
  }
}

/**
 * Check if user has permission to access a specific tab
 */
export async function canAccessTab(role: "user" | "admin" | "sale", tab: string): Promise<boolean> {
  const permissions = await getRolePermissions(role);
  if (!permissions) return false;
  return permissions.tabs.includes(tab);
}

/**
 * Check if user can delete records
 */
export async function canDelete(role: "user" | "admin" | "sale"): Promise<boolean> {
  const permissions = await getRolePermissions(role);
  if (!permissions) return false;
  return permissions.canDelete;
}

/**
 * Check if user can edit records
 */
export async function canEdit(role: "user" | "admin" | "sale"): Promise<boolean> {
  const permissions = await getRolePermissions(role);
  if (!permissions) return false;
  return permissions.canEdit;
}

/**
 * Check if user can create records
 */
export async function canCreate(role: "user" | "admin" | "sale"): Promise<boolean> {
  const permissions = await getRolePermissions(role);
  if (!permissions) return false;
  return permissions.canCreate;
}

