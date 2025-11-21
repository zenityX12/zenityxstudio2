import { describe, expect, it } from "vitest";
import { getDb } from "../db";

describe("Database Connection", () => {
  it("should connect to TiDB successfully", async () => {
    const db = await getDb();
    expect(db).toBeDefined();
    expect(db).not.toBeNull();
  });

  it("should execute a simple query", async () => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database connection failed");
    }

    // Execute a simple SELECT 1 query to verify connection
    const result = await db.execute("SELECT 1 as test");
    expect(result).toBeDefined();
  });
});

