import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { pool } from '../db/pool.js';
import { migrate } from '../db/migrate.js';
import { resetDb } from '../db/reset.js';

beforeAll(async () => {
  await migrate();
  await resetDb();
});
afterAll(async () => {
  await pool.end();
});

describe('database schema', () => {
  it('can insert and read a category', async () => {
    await pool.query(
      "INSERT INTO categories (name, slug) VALUES ('Test', 'test')"
    );
    const { rows } = await pool.query('SELECT slug FROM categories WHERE slug = $1', ['test']);
    expect(rows[0].slug).toBe('test');
  });

  it('rejects invalid user role', async () => {
    await expect(
      pool.query(
        "INSERT INTO users (email, password_hash, full_name, role) VALUES ('a@b.com','x','A','superuser')"
      )
    ).rejects.toThrow();
  });
});
