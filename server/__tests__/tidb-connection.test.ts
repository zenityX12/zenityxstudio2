import { describe, it, expect } from "vitest";
import { getDb } from "../db";
import { users, credits, aiModels } from "../../drizzle/schema";
import { sql } from "drizzle-orm";

describe("TiDB Connection Tests", () => {
  it("should connect to TiDB successfully", async () => {
    const db = await getDb();
    expect(db).toBeDefined();
    if (!db) throw new Error("Database not available");
    const result = await db.execute(sql`SELECT 1 as test`);
    expect(result).toBeDefined();
  });

  it("should query database version", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const result = await db.execute(sql`SELECT VERSION() as version`);
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("should query current database", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const result = await db.execute(sql`SELECT DATABASE() as db`);
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("should list all tables", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const result = await db.execute(sql`SHOW TABLES`);
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
  });

  it("should verify users table exists", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const result = await db.execute(sql`SHOW TABLES LIKE 'users'`);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("should verify credits table exists", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const result = await db.execute(sql`SHOW TABLES LIKE 'credits'`);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("should verify aiModels table exists", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const result = await db.execute(sql`SHOW TABLES LIKE 'aiModels'`);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });
});
