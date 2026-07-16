import { pool } from './pool.js';

export async function resetDb() {
  await pool.query('TRUNCATE users, products, categories RESTART IDENTITY CASCADE');
}
