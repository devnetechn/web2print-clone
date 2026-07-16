import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';
import { migrate } from './migrate.js';

const here = path.dirname(fileURLToPath(import.meta.url));

export async function seed() {
  await migrate();
  const sql = fs.readFileSync(path.join(here, 'seed.sql'), 'utf8');
  await pool.query(sql);
  console.log('seeded sample catalog');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seed()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
