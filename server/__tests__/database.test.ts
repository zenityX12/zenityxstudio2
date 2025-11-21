import { describe, it, expect } from 'vitest';
import { getDb } from '../db';

describe('Database Connection', () => {
  it('should connect to database successfully', async () => {
    const db = await getDb();
    expect(db).toBeDefined();
    expect(db).not.toBeNull();
  }, 30000); // 30 second timeout for database connection

  it('should execute a simple query', async () => {
    const db = await getDb();
    if (!db) {
      throw new Error('Database connection failed');
    }
    
    // Simple query to test connection
    const result = await db.execute('SELECT 1 as test');
    expect(result).toBeDefined();
  }, 30000);
});

