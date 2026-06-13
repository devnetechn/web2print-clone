# Web2Print Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the foundation of the web2print platform — JWT auth (register/login/me with customer/admin roles) and a DB-seeded product catalog (categories + products), with a React frontend to browse the catalog and manage an account.

**Architecture:** Monorepo with separate `backend/` (Node + Express + raw `pg`) and `frontend/` (React + Vite + Tailwind) apps communicating over a REST JSON API. Backend is organized into vertical modules (auth, catalog), each split into routes → controller → service → repository. PostgreSQL accessed via parameterized SQL through a connection pool; schema/seed via plain `.sql` files run by small Node runners.

**Tech Stack:** Node.js, Express 4, `pg`, `bcryptjs`, `jsonwebtoken`, `zod`, `cors`, Vitest + Supertest (backend). React 18, Vite, Tailwind CSS 3, `react-router-dom`, `axios`, Vitest + React Testing Library (frontend).

---

## File Structure

```
web2print/
├── backend/
│   ├── .env.example
│   ├── .env                         (dev, gitignored)
│   ├── .env.test                    (test DB, gitignored)
│   ├── package.json
│   ├── vitest.config.js
│   ├── vitest.setup.js              loads .env.test before app imports
│   └── src/
│       ├── config/env.js            validated env access
│       ├── db/
│       │   ├── pool.js              pg Pool
│       │   ├── migrate.js           runs migrations/*.sql in order
│       │   ├── seed.js              runs seed.sql
│       │   ├── reset.js             test helper: TRUNCATE all tables
│       │   ├── migrations/
│       │   │   ├── 001_create_users.sql
│       │   │   ├── 002_create_categories.sql
│       │   │   └── 003_create_products.sql
│       │   └── seed.sql
│       ├── middleware/
│       │   ├── error.js             AppError + errorHandler
│       │   ├── validation.js        zod validate()
│       │   └── auth.js              requireAuth (JWT)
│       ├── modules/
│       │   ├── auth/
│       │   │   ├── auth.repository.js
│       │   │   ├── auth.service.js
│       │   │   ├── auth.controller.js
│       │   │   └── auth.routes.js
│       │   └── catalog/
│       │       ├── catalog.repository.js
│       │       ├── catalog.service.js
│       │       └── catalog.routes.js
│       ├── app.js                   createApp()
│       └── server.js                boots HTTP server
│       └── __tests__/
│           ├── auth.test.js
│           └── catalog.test.js
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── vitest.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    ├── .env                          (VITE_API_URL, gitignored)
    └── src/
        ├── main.jsx
        ├── App.jsx                   routes
        ├── index.css                 tailwind directives
        ├── api/
        │   ├── client.js             axios instance + setAuthToken
        │   ├── auth.js               register/login/me calls
        │   └── catalog.js            categories/products calls
        ├── context/AuthContext.jsx   user/token state
        ├── components/
        │   ├── Navbar.jsx
        │   ├── Footer.jsx
        │   ├── ProductCard.jsx
        │   └── ProtectedRoute.jsx
        └── pages/
            ├── Home.jsx
            ├── Catalog.jsx
            ├── Product.jsx
            ├── Login.jsx
            ├── Register.jsx
            └── Account.jsx
```

**Prerequisites (developer runs once):** PostgreSQL installed and running. Create two databases:
```bash
createdb web2print
createdb web2print_test
```

---

## Task 1: Backend scaffold + health route

**Files:**
- Create: `backend/package.json`, `backend/.env.example`, `backend/.env`, `backend/src/config/env.js`, `backend/src/middleware/error.js`, `backend/src/app.js`, `backend/src/server.js`, `backend/vitest.config.js`, `backend/vitest.setup.js`, `backend/.env.test`
- Test: `backend/src/__tests__/health.test.js`

- [ ] **Step 1: Create `backend/package.json`**

```json
{
  "name": "web2print-backend",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "node --watch src/server.js",
    "start": "node src/server.js",
    "migrate": "node src/db/migrate.js",
    "seed": "node src/db/seed.js",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "jsonwebtoken": "^9.0.2",
    "pg": "^8.12.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "supertest": "^7.0.0",
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run (from `backend/`): `npm install`
Expected: `node_modules/` created, no errors.

- [ ] **Step 3: Create env files**

`backend/.env.example`:
```
PORT=5000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/web2print
JWT_SECRET=change-me-in-production
CORS_ORIGIN=http://localhost:5173
```

`backend/.env` (copy of example; adjust user/password to your local Postgres):
```
PORT=5000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/web2print
JWT_SECRET=dev-secret-do-not-use-in-prod
CORS_ORIGIN=http://localhost:5173
```

`backend/.env.test`:
```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/web2print_test
JWT_SECRET=test-secret
CORS_ORIGIN=http://localhost:5173
```

- [ ] **Step 4: Create `backend/src/config/env.js`**

```js
import 'dotenv/config';

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const env = {
  port: Number(process.env.PORT) || 5000,
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};
```

- [ ] **Step 5: Create `backend/src/middleware/error.js`**

```js
export class AppError extends Error {
  constructor(message, status = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = status === 500 ? 'Internal server error' : err.message;
  if (status === 500) console.error(err);
  res.status(status).json({ error: { message, code } });
}
```

- [ ] **Step 6: Create `backend/src/app.js`**

```js
import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error.js';

export function createApp() {
  const app = express();
  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json());

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  app.use(errorHandler);
  return app;
}
```

- [ ] **Step 7: Create `backend/src/server.js`**

```js
import { createApp } from './app.js';
import { env } from './config/env.js';

createApp().listen(env.port, () => {
  console.log(`web2print API listening on http://localhost:${env.port}`);
});
```

- [ ] **Step 8: Create `backend/vitest.setup.js`**

```js
import dotenv from 'dotenv';
// Load test env BEFORE any app module imports config/env.js.
// dotenv does not override already-set process.env vars.
dotenv.config({ path: '.env.test' });
```

- [ ] **Step 9: Create `backend/vitest.config.js`**

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.js'],
    fileParallelism: false,
  },
});
```

- [ ] **Step 10: Write the failing health test — `backend/src/__tests__/health.test.js`**

```js
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

describe('GET /api/health', () => {
  it('returns ok status', async () => {
    const res = await request(createApp()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
```

- [ ] **Step 11: Run the test**

Run (from `backend/`): `npm test`
Expected: PASS (1 test). If it fails on missing env, ensure `.env.test` exists.

- [ ] **Step 12: Commit**

```bash
git add backend/package.json backend/.env.example backend/vitest.config.js backend/vitest.setup.js backend/src
git commit -m "feat(backend): scaffold express app with health route"
```

---

## Task 2: Database layer (pool, migrations, seed, reset)

**Files:**
- Create: `backend/src/db/pool.js`, `backend/src/db/migrate.js`, `backend/src/db/seed.js`, `backend/src/db/reset.js`, `backend/src/db/migrations/001_create_users.sql`, `002_create_categories.sql`, `003_create_products.sql`, `backend/src/db/seed.sql`
- Test: `backend/src/__tests__/db.test.js`

- [ ] **Step 1: Create `backend/src/db/pool.js`**

```js
import pg from 'pg';
import { env } from '../config/env.js';

export const pool = new pg.Pool({ connectionString: env.databaseUrl });
```

- [ ] **Step 2: Create migration `001_create_users.sql`**

```sql
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'customer'
                  CHECK (role IN ('customer','admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- [ ] **Step 3: Create migration `002_create_categories.sql`**

```sql
CREATE TABLE IF NOT EXISTS categories (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  description TEXT,
  image_url   TEXT,
  parent_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL
);
```

- [ ] **Step 4: Create migration `003_create_products.sql`**

```sql
CREATE TABLE IF NOT EXISTS products (
  id          SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  description TEXT,
  base_price  NUMERIC(10,2) NOT NULL,
  image_url   TEXT,
  attributes  JSONB NOT NULL DEFAULT '{}',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- [ ] **Step 5: Create `backend/src/db/migrate.js`**

```js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';

const here = path.dirname(fileURLToPath(import.meta.url));

export async function migrate() {
  const dir = path.join(here, 'migrations');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    await pool.query(sql);
    console.log(`migrated: ${file}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  migrate()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
```

- [ ] **Step 6: Create `backend/src/db/seed.sql`**

```sql
-- Idempotent seed: clear then insert sample data.
TRUNCATE products, categories RESTART IDENTITY CASCADE;

INSERT INTO categories (name, slug, description, image_url) VALUES
  ('Marketing',      'marketing',      'Business cards, flyers, and marketing print', NULL),
  ('Apparel',        'apparel',        'Custom printed shirts and apparel',           NULL),
  ('Signs & Banners','signs-banners',  'Large-format signage and banners',            NULL);

INSERT INTO products (category_id, name, slug, description, base_price, attributes) VALUES
  ((SELECT id FROM categories WHERE slug='marketing'),
    'Business Cards', 'business-cards', 'Premium 16pt business cards', 19.99,
    '{"sizes":["3.5x2"],"paper":["matte","glossy"],"quantities":[100,250,500]}'),
  ((SELECT id FROM categories WHERE slug='marketing'),
    'Flyers', 'flyers', 'Full-color flyers', 39.99,
    '{"sizes":["8.5x11","5.5x8.5"],"paper":["matte","glossy"],"quantities":[50,100,250]}'),
  ((SELECT id FROM categories WHERE slug='apparel'),
    'Custom T-Shirt', 'custom-t-shirt', 'Soft-style printed tee', 14.99,
    '{"sizes":["S","M","L","XL"],"colors":["black","white","navy"]}'),
  ((SELECT id FROM categories WHERE slug='signs-banners'),
    'Vinyl Banner', 'vinyl-banner', '13oz outdoor vinyl banner', 59.99,
    '{"sizes":["2x4","3x6","4x8"],"finish":["grommets","pole-pocket"]}');
```

- [ ] **Step 7: Create `backend/src/db/seed.js`**

```js
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
```

- [ ] **Step 8: Create `backend/src/db/reset.js` (test helper)**

```js
import { pool } from './pool.js';

export async function resetDb() {
  await pool.query('TRUNCATE users, products, categories RESTART IDENTITY CASCADE');
}
```

- [ ] **Step 9: Write the failing DB test — `backend/src/__tests__/db.test.js`**

```js
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
```

- [ ] **Step 10: Run the test**

Run: `npm test -- db.test.js`
Expected: PASS (2 tests). Requires `web2print_test` database to exist.

- [ ] **Step 11: Seed the dev database and verify**

Run: `npm run seed`
Expected: logs `migrated: ...` then `seeded sample catalog`.

- [ ] **Step 12: Commit**

```bash
git add backend/src/db
git commit -m "feat(backend): add postgres pool, migrations, and seed data"
```

---

## Task 3: Auth — register endpoint

**Files:**
- Create: `backend/src/middleware/validation.js`, `backend/src/modules/auth/auth.repository.js`, `auth.service.js`, `auth.controller.js`, `auth.routes.js`
- Modify: `backend/src/app.js` (mount auth routes)
- Test: `backend/src/__tests__/auth.test.js`

- [ ] **Step 1: Create `backend/src/middleware/validation.js`**

```js
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          fields: result.error.flatten().fieldErrors,
        },
      });
    }
    req[source] = result.data;
    next();
  };
}
```

- [ ] **Step 2: Create `backend/src/modules/auth/auth.repository.js`**

```js
import { pool } from '../../db/pool.js';

export async function findUserByEmail(email) {
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return rows[0] || null;
}

export async function findUserById(id) {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function insertUser({ email, passwordHash, fullName }) {
  const { rows } = await pool.query(
    `INSERT INTO users (email, password_hash, full_name)
     VALUES ($1, $2, $3) RETURNING *`,
    [email, passwordHash, fullName]
  );
  return rows[0];
}
```

- [ ] **Step 3: Create `backend/src/modules/auth/auth.service.js`**

```js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { AppError } from '../../middleware/error.js';
import * as repo from './auth.repository.js';

export function mapUser(row) {
  return { id: row.id, email: row.email, fullName: row.full_name, role: row.role };
}

function signToken(row) {
  return jwt.sign({ userId: row.id, role: row.role }, env.jwtSecret, { expiresIn: '7d' });
}

export async function register({ email, password, fullName }) {
  const existing = await repo.findUserByEmail(email);
  if (existing) throw new AppError('Email already registered', 409, 'EMAIL_TAKEN');
  const passwordHash = await bcrypt.hash(password, 10);
  const row = await repo.insertUser({ email, passwordHash, fullName });
  return { user: mapUser(row), token: signToken(row) };
}

export async function login({ email, password }) {
  const row = await repo.findUserByEmail(email);
  if (!row) throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  return { user: mapUser(row), token: signToken(row) };
}

export async function getMe(userId) {
  const row = await repo.findUserById(userId);
  if (!row) throw new AppError('User not found', 404, 'NOT_FOUND');
  return mapUser(row);
}
```

- [ ] **Step 4: Create `backend/src/modules/auth/auth.controller.js`**

```js
import * as service from './auth.service.js';

export async function register(req, res, next) {
  try {
    res.status(201).json(await service.register(req.body));
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    res.json(await service.login(req.body));
  } catch (err) {
    next(err);
  }
}

export async function me(req, res, next) {
  try {
    res.json({ user: await service.getMe(req.user.userId) });
  } catch (err) {
    next(err);
  }
}
```

- [ ] **Step 5: Create `backend/src/modules/auth/auth.routes.js`**

```js
import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validation.js';
import { requireAuth } from '../../middleware/auth.js';
import * as controller from './auth.controller.js';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authRoutes = Router();
authRoutes.post('/register', validate(registerSchema), controller.register);
authRoutes.post('/login', validate(loginSchema), controller.login);
authRoutes.get('/me', requireAuth, controller.me);
```

> Note: `requireAuth` is created in Task 5. Until then `/me` will fail to import. To keep tasks independently runnable, create a temporary stub now and replace it in Task 5: create `backend/src/middleware/auth.js` with `export function requireAuth(req, res, next) { next(); }` — Task 5 replaces the body.

- [ ] **Step 6: Create the temporary `backend/src/middleware/auth.js` stub**

```js
// Temporary stub — replaced with real JWT verification in Task 5.
export function requireAuth(req, res, next) {
  next();
}
```

- [ ] **Step 7: Mount auth routes in `backend/src/app.js`**

Replace the file contents with:
```js
import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error.js';
import { authRoutes } from './modules/auth/auth.routes.js';

export function createApp() {
  const app = express();
  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json());

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', authRoutes);

  app.use(errorHandler);
  return app;
}
```

- [ ] **Step 8: Write the failing register test — `backend/src/__tests__/auth.test.js`**

```js
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { pool } from '../db/pool.js';
import { migrate } from '../db/migrate.js';
import { resetDb } from '../db/reset.js';

const app = createApp();

beforeAll(async () => { await migrate(); });
beforeEach(async () => { await resetDb(); });
afterAll(async () => { await pool.end(); });

describe('POST /api/auth/register', () => {
  it('creates a user and returns a token', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'jane@example.com',
      password: 'password123',
      fullName: 'Jane Doe',
    });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTypeOf('string');
    expect(res.body.user).toMatchObject({
      email: 'jane@example.com',
      fullName: 'Jane Doe',
      role: 'customer',
    });
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('rejects a duplicate email', async () => {
    const body = { email: 'dup@example.com', password: 'password123', fullName: 'Dup' };
    await request(app).post('/api/auth/register').send(body);
    const res = await request(app).post('/api/auth/register').send(body);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('rejects a short password', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'x@example.com', password: 'short', fullName: 'X',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
```

- [ ] **Step 9: Run the test**

Run: `npm test -- auth.test.js`
Expected: PASS (3 tests).

- [ ] **Step 10: Commit**

```bash
git add backend/src/middleware/validation.js backend/src/modules/auth backend/src/middleware/auth.js backend/src/app.js backend/src/__tests__/auth.test.js
git commit -m "feat(backend): add user registration with validation"
```

---

## Task 4: Auth — login endpoint

**Files:**
- Modify: `backend/src/__tests__/auth.test.js` (add login describe block)
- (Implementation already exists in `auth.service.js` / `auth.routes.js` from Task 3.)

- [ ] **Step 1: Add a failing login test to `backend/src/__tests__/auth.test.js`**

Append inside the file (after the register `describe` block):
```js
describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send({
      email: 'login@example.com', password: 'password123', fullName: 'Log In',
    });
  });

  it('returns a token for valid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'login@example.com', password: 'password123',
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTypeOf('string');
    expect(res.body.user.email).toBe('login@example.com');
  });

  it('rejects a wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'login@example.com', password: 'wrongpass',
    });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejects an unknown email', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nobody@example.com', password: 'password123',
    });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npm test -- auth.test.js`
Expected: PASS (6 tests total). Implementation already present from Task 3.

- [ ] **Step 3: Commit**

```bash
git add backend/src/__tests__/auth.test.js
git commit -m "test(backend): cover login flow"
```

---

## Task 5: Auth — JWT middleware + `/me`

**Files:**
- Modify: `backend/src/middleware/auth.js` (replace stub with real JWT verification)
- Modify: `backend/src/__tests__/auth.test.js` (add `/me` block)

- [ ] **Step 1: Add a failing `/me` test to `backend/src/__tests__/auth.test.js`**

Append after the login `describe` block:
```js
describe('GET /api/auth/me', () => {
  it('returns the current user with a valid token', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      email: 'me@example.com', password: 'password123', fullName: 'Me User',
    });
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${reg.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('me@example.com');
  });

  it('rejects a request with no token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects an invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run the test (expect failure)**

Run: `npm test -- auth.test.js`
Expected: FAIL — the stub `requireAuth` calls `next()` so `/me` with no token throws (`req.user` undefined) instead of returning 401.

- [ ] **Step 3: Replace `backend/src/middleware/auth.js` with real verification**

```js
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } });
  }
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = { userId: payload.userId, role: payload.role };
    next();
  } catch {
    res.status(401).json({ error: { message: 'Invalid token', code: 'UNAUTHORIZED' } });
  }
}
```

- [ ] **Step 4: Run the test**

Run: `npm test -- auth.test.js`
Expected: PASS (9 tests total).

- [ ] **Step 5: Commit**

```bash
git add backend/src/middleware/auth.js backend/src/__tests__/auth.test.js
git commit -m "feat(backend): add JWT auth middleware and /me endpoint"
```

---

## Task 6: Catalog — categories endpoint

**Files:**
- Create: `backend/src/modules/catalog/catalog.repository.js`, `catalog.service.js`, `catalog.routes.js`
- Modify: `backend/src/app.js` (mount catalog routes)
- Test: `backend/src/__tests__/catalog.test.js`

- [ ] **Step 1: Create `backend/src/modules/catalog/catalog.repository.js`**

```js
import { pool } from '../../db/pool.js';

export async function listCategories() {
  const { rows } = await pool.query('SELECT * FROM categories ORDER BY name');
  return rows;
}

export async function listProducts({ categorySlug, limit, offset }) {
  const params = [];
  let filter = 'WHERE p.is_active = true';
  if (categorySlug) {
    params.push(categorySlug);
    filter += ` AND c.slug = $${params.length}`;
  }
  params.push(limit);
  const limitIdx = params.length;
  params.push(offset);
  const offsetIdx = params.length;

  const { rows } = await pool.query(
    `SELECT p.* FROM products p
     JOIN categories c ON c.id = p.category_id
     ${filter}
     ORDER BY p.created_at DESC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    params
  );

  const countParams = categorySlug ? [categorySlug] : [];
  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*)::int AS total FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE p.is_active = true ${categorySlug ? 'AND c.slug = $1' : ''}`,
    countParams
  );

  return { products: rows, total: countRows[0].total };
}

export async function findProductBySlug(slug) {
  const { rows } = await pool.query(
    'SELECT * FROM products WHERE slug = $1 AND is_active = true',
    [slug]
  );
  return rows[0] || null;
}
```

- [ ] **Step 2: Create `backend/src/modules/catalog/catalog.service.js`**

```js
import { AppError } from '../../middleware/error.js';
import * as repo from './catalog.repository.js';

export function mapCategory(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    imageUrl: row.image_url,
    parentId: row.parent_id,
  };
}

export function mapProduct(row) {
  return {
    id: row.id,
    categoryId: row.category_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    basePrice: Number(row.base_price),
    imageUrl: row.image_url,
    attributes: row.attributes,
  };
}

export async function getCategories() {
  return (await repo.listCategories()).map(mapCategory);
}

export async function getProducts({ category, page, limit }) {
  const offset = (page - 1) * limit;
  const { products, total } = await repo.listProducts({ categorySlug: category, limit, offset });
  return { products: products.map(mapProduct), total, page, limit };
}

export async function getProduct(slug) {
  const row = await repo.findProductBySlug(slug);
  if (!row) throw new AppError('Product not found', 404, 'NOT_FOUND');
  return mapProduct(row);
}
```

- [ ] **Step 3: Create `backend/src/modules/catalog/catalog.routes.js`**

```js
import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validation.js';
import * as service from './catalog.service.js';

const listQuery = z.object({
  category: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
});

export const catalogRoutes = Router();

catalogRoutes.get('/categories', async (req, res, next) => {
  try {
    res.json({ categories: await service.getCategories() });
  } catch (err) {
    next(err);
  }
});

catalogRoutes.get('/products', validate(listQuery, 'query'), async (req, res, next) => {
  try {
    res.json(await service.getProducts(req.query));
  } catch (err) {
    next(err);
  }
});

catalogRoutes.get('/products/:slug', async (req, res, next) => {
  try {
    res.json({ product: await service.getProduct(req.params.slug) });
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 4: Mount catalog routes in `backend/src/app.js`**

Add the import and mount line so the file becomes:
```js
import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { catalogRoutes } from './modules/catalog/catalog.routes.js';

export function createApp() {
  const app = express();
  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json());

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', authRoutes);
  app.use('/api', catalogRoutes);

  app.use(errorHandler);
  return app;
}
```

- [ ] **Step 5: Write the failing categories test — `backend/src/__tests__/catalog.test.js`**

```js
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { pool } from '../db/pool.js';
import { migrate } from '../db/migrate.js';
import { resetDb } from '../db/reset.js';

const app = createApp();

beforeAll(async () => { await migrate(); });
beforeEach(async () => {
  await resetDb();
  await pool.query(`
    INSERT INTO categories (name, slug) VALUES ('Marketing','marketing'), ('Apparel','apparel');
  `);
  await pool.query(`
    INSERT INTO products (category_id, name, slug, base_price)
    VALUES
      ((SELECT id FROM categories WHERE slug='marketing'),'Business Cards','business-cards',19.99),
      ((SELECT id FROM categories WHERE slug='apparel'),'Custom Tee','custom-tee',14.99);
  `);
});
afterAll(async () => { await pool.end(); });

describe('GET /api/categories', () => {
  it('returns all categories', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
    expect(res.body.categories).toHaveLength(2);
    expect(res.body.categories[0]).toHaveProperty('slug');
  });
});
```

- [ ] **Step 6: Run the test**

Run: `npm test -- catalog.test.js`
Expected: PASS (1 test).

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/catalog backend/src/app.js backend/src/__tests__/catalog.test.js
git commit -m "feat(backend): add categories endpoint"
```

---

## Task 7: Catalog — products list (filter + pagination)

**Files:**
- Modify: `backend/src/__tests__/catalog.test.js` (add products list block)
- (Implementation already exists from Task 6.)

- [ ] **Step 1: Add a failing products test to `backend/src/__tests__/catalog.test.js`**

Append after the categories `describe` block:
```js
describe('GET /api/products', () => {
  it('returns all active products with pagination metadata', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body.products).toHaveLength(2);
    expect(res.body).toMatchObject({ total: 2, page: 1, limit: 12 });
    expect(res.body.products[0].basePrice).toBeTypeOf('number');
  });

  it('filters products by category slug', async () => {
    const res = await request(app).get('/api/products?category=apparel');
    expect(res.status).toBe(200);
    expect(res.body.products).toHaveLength(1);
    expect(res.body.products[0].slug).toBe('custom-tee');
  });

  it('respects limit pagination', async () => {
    const res = await request(app).get('/api/products?limit=1');
    expect(res.body.products).toHaveLength(1);
    expect(res.body.total).toBe(2);
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npm test -- catalog.test.js`
Expected: PASS (4 tests total).

- [ ] **Step 3: Commit**

```bash
git add backend/src/__tests__/catalog.test.js
git commit -m "test(backend): cover product listing, filtering, pagination"
```

---

## Task 8: Catalog — product detail

**Files:**
- Modify: `backend/src/__tests__/catalog.test.js` (add product detail block)
- (Implementation already exists from Task 6.)

- [ ] **Step 1: Add a failing detail test to `backend/src/__tests__/catalog.test.js`**

Append after the products list `describe` block:
```js
describe('GET /api/products/:slug', () => {
  it('returns a single product by slug', async () => {
    const res = await request(app).get('/api/products/business-cards');
    expect(res.status).toBe(200);
    expect(res.body.product.name).toBe('Business Cards');
  });

  it('returns 404 for an unknown slug', async () => {
    const res = await request(app).get('/api/products/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
```

- [ ] **Step 2: Run the full backend suite**

Run: `npm test`
Expected: PASS — health, db, auth (9), catalog (6).

- [ ] **Step 3: Commit**

```bash
git add backend/src/__tests__/catalog.test.js
git commit -m "test(backend): cover product detail and 404"
```

---

## Task 9: Frontend scaffold (Vite + Tailwind + Router)

**Files:**
- Create: `frontend/package.json`, `vite.config.js`, `vitest.config.js`, `tailwind.config.js`, `postcss.config.js`, `index.html`, `.env`, `src/main.jsx`, `src/App.jsx`, `src/index.css`
- Test: `frontend/src/__tests__/App.test.jsx`

- [ ] **Step 1: Create `frontend/package.json`**

```json
{
  "name": "web2print-frontend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "axios": "^1.7.2",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.24.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.6",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.2",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.19",
    "jsdom": "^24.1.0",
    "postcss": "^8.4.39",
    "tailwindcss": "^3.4.4",
    "vite": "^5.3.1",
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run (from `frontend/`): `npm install`
Expected: no errors.

- [ ] **Step 3: Create config files**

`frontend/vite.config.js`:
```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({ plugins: [react()] });
```

`frontend/vitest.config.js`:
```js
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.js'],
  },
});
```

`frontend/src/setupTests.js`:
```js
import '@testing-library/jest-dom';
```

`frontend/tailwind.config.js`:
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: {} },
  plugins: [],
};
```

`frontend/postcss.config.js`:
```js
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

`frontend/.env`:
```
VITE_API_URL=http://localhost:5000/api
```

- [ ] **Step 4: Create `frontend/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Web2Print</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create `frontend/src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 6: Create `frontend/src/App.jsx`**

```jsx
import { Routes, Route } from 'react-router-dom';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<h1 className="text-2xl font-bold">Web2Print</h1>} />
    </Routes>
  );
}
```

- [ ] **Step 7: Create `frontend/src/main.jsx`**

```jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
```

- [ ] **Step 8: Write the failing App test — `frontend/src/__tests__/App.test.jsx`**

```jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App.jsx';

describe('App', () => {
  it('renders the home heading', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText('Web2Print')).toBeInTheDocument();
  });
});
```

- [ ] **Step 9: Run the test**

Run: `npm test`
Expected: PASS (1 test).

- [ ] **Step 10: Commit**

```bash
git add frontend/package.json frontend/vite.config.js frontend/vitest.config.js frontend/tailwind.config.js frontend/postcss.config.js frontend/index.html frontend/src
git commit -m "feat(frontend): scaffold vite + react + tailwind app"
```

---

## Task 10: Frontend API client + AuthContext

**Files:**
- Create: `frontend/src/api/client.js`, `api/auth.js`, `api/catalog.js`, `src/context/AuthContext.jsx`
- Test: `frontend/src/__tests__/AuthContext.test.jsx`

- [ ] **Step 1: Create `frontend/src/api/client.js`**

```js
import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}
```

- [ ] **Step 2: Create `frontend/src/api/auth.js`**

```js
import { api } from './client.js';

export const registerRequest = (data) => api.post('/auth/register', data).then((r) => r.data);
export const loginRequest = (data) => api.post('/auth/login', data).then((r) => r.data);
export const meRequest = () => api.get('/auth/me').then((r) => r.data.user);
```

- [ ] **Step 3: Create `frontend/src/api/catalog.js`**

```js
import { api } from './client.js';

export const fetchCategories = () => api.get('/categories').then((r) => r.data.categories);
export const fetchProducts = (params) => api.get('/products', { params }).then((r) => r.data);
export const fetchProduct = (slug) => api.get(`/products/${slug}`).then((r) => r.data.product);
```

- [ ] **Step 4: Create `frontend/src/context/AuthContext.jsx`**

```jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { setAuthToken } from '../api/client.js';
import { loginRequest, registerRequest, meRequest } from '../api/auth.js';

const AuthContext = createContext(null);
const TOKEN_KEY = 'web2print_token';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(Boolean(localStorage.getItem(TOKEN_KEY)));

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    setAuthToken(token);
    meRequest()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setAuthToken(null);
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  function persist({ user, token }) {
    localStorage.setItem(TOKEN_KEY, token);
    setAuthToken(token);
    setToken(token);
    setUser(user);
  }

  async function login(credentials) {
    persist(await loginRequest(credentials));
  }

  async function register(data) {
    persist(await registerRequest(data));
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setAuthToken(null);
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

- [ ] **Step 5: Write the failing AuthContext test — `frontend/src/__tests__/AuthContext.test.jsx`**

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../context/AuthContext.jsx';

vi.mock('../api/auth.js', () => ({
  loginRequest: vi.fn(() =>
    Promise.resolve({ user: { email: 'a@b.com', fullName: 'A B', role: 'customer' }, token: 'tok123' })
  ),
  registerRequest: vi.fn(),
  meRequest: vi.fn(() => Promise.resolve({ email: 'a@b.com' })),
}));

function Probe() {
  const { user, login } = useAuth();
  return (
    <div>
      <span data-testid="email">{user ? user.email : 'anon'}</span>
      <button onClick={() => login({ email: 'a@b.com', password: 'password123' })}>login</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => localStorage.clear());

  it('starts anonymous and sets user after login', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    expect(screen.getByTestId('email')).toHaveTextContent('anon');
    await userEvent.click(screen.getByText('login'));
    await waitFor(() => expect(screen.getByTestId('email')).toHaveTextContent('a@b.com'));
    expect(localStorage.getItem('web2print_token')).toBe('tok123');
  });
});
```

- [ ] **Step 6: Run the test**

Run: `npm test -- AuthContext`
Expected: PASS (1 test).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/api frontend/src/context frontend/src/__tests__/AuthContext.test.jsx
git commit -m "feat(frontend): add api client and auth context"
```

---

## Task 11: Frontend auth pages (Login + Register)

**Files:**
- Create: `frontend/src/pages/Login.jsx`, `frontend/src/pages/Register.jsx`
- Test: `frontend/src/__tests__/Login.test.jsx`

- [ ] **Step 1: Create `frontend/src/pages/Login.jsx`**

```jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await login({ email, password });
      navigate('/account');
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Login failed');
    }
  }

  return (
    <div className="mx-auto max-w-sm p-6">
      <h1 className="mb-4 text-2xl font-bold">Log in</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium">Email</label>
          <input id="email" type="email" required value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2" />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium">Password</label>
          <input id="password" type="password" required value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2" />
        </div>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="w-full rounded bg-blue-600 py-2 text-white">Log in</button>
      </form>
      <p className="mt-4 text-sm">
        No account? <Link to="/register" className="text-blue-600">Register</Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Create `frontend/src/pages/Register.jsx`**

```jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await register({ fullName, email, password });
      navigate('/account');
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Registration failed');
    }
  }

  return (
    <div className="mx-auto max-w-sm p-6">
      <h1 className="mb-4 text-2xl font-bold">Create account</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium">Full name</label>
          <input id="fullName" required value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2" />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium">Email</label>
          <input id="email" type="email" required value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2" />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium">Password (min 8)</label>
          <input id="password" type="password" required minLength={8} value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2" />
        </div>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="w-full rounded bg-blue-600 py-2 text-white">Register</button>
      </form>
      <p className="mt-4 text-sm">
        Have an account? <Link to="/login" className="text-blue-600">Log in</Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Write the failing Login test — `frontend/src/__tests__/Login.test.jsx`**

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Login from '../pages/Login.jsx';

const loginMock = vi.fn(() => Promise.resolve());
vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => ({ login: loginMock }),
}));

describe('Login page', () => {
  it('submits email and password to login()', async () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    await waitFor(() =>
      expect(loginMock).toHaveBeenCalledWith({ email: 'a@b.com', password: 'password123' })
    );
  });
});
```

- [ ] **Step 4: Run the test**

Run: `npm test -- Login`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Login.jsx frontend/src/pages/Register.jsx frontend/src/__tests__/Login.test.jsx
git commit -m "feat(frontend): add login and register pages"
```

---

## Task 12: Frontend catalog pages (Home, Catalog, Product) + components

**Files:**
- Create: `frontend/src/components/ProductCard.jsx`, `frontend/src/pages/Home.jsx`, `frontend/src/pages/Catalog.jsx`, `frontend/src/pages/Product.jsx`
- Test: `frontend/src/__tests__/Catalog.test.jsx`

- [ ] **Step 1: Create `frontend/src/components/ProductCard.jsx`**

```jsx
import { Link } from 'react-router-dom';

export default function ProductCard({ product }) {
  return (
    <Link
      to={`/products/${product.slug}`}
      className="block rounded-lg border p-4 transition hover:shadow-md"
    >
      <div className="mb-3 aspect-square rounded bg-gray-100" />
      <h3 className="font-semibold">{product.name}</h3>
      <p className="text-sm text-gray-600">From ${product.basePrice.toFixed(2)}</p>
    </Link>
  );
}
```

- [ ] **Step 2: Create `frontend/src/pages/Catalog.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchCategories, fetchProducts } from '../api/catalog.js';
import ProductCard from '../components/ProductCard.jsx';

export default function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get('category') || '';
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchProducts(category ? { category } : {})
      .then((data) => setProducts(data.products))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [category]);

  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="mb-4 text-2xl font-bold">Shop products</h1>
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setSearchParams({})}
          className={`rounded-full border px-3 py-1 text-sm ${!category ? 'bg-blue-600 text-white' : ''}`}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setSearchParams({ category: c.slug })}
            className={`rounded-full border px-3 py-1 text-sm ${category === c.slug ? 'bg-blue-600 text-white' : ''}`}
          >
            {c.name}
          </button>
        ))}
      </div>
      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create `frontend/src/pages/Product.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchProduct } from '../api/catalog.js';

export default function Product() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProduct(slug)
      .then(setProduct)
      .catch(() => setError('Product not found'));
  }, [slug]);

  if (error) return <p className="p-6">{error} — <Link to="/catalog" className="text-blue-600">Back to catalog</Link></p>;
  if (!product) return <p className="p-6">Loading…</p>;

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="grid gap-8 md:grid-cols-2">
        <div className="aspect-square rounded-lg bg-gray-100" />
        <div>
          <h1 className="text-3xl font-bold">{product.name}</h1>
          <p className="mt-2 text-xl text-gray-700">From ${product.basePrice.toFixed(2)}</p>
          <p className="mt-4 text-gray-600">{product.description}</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `frontend/src/pages/Home.jsx`**

```jsx
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="mx-auto max-w-5xl p-6">
      <section className="rounded-2xl bg-blue-600 px-8 py-16 text-center text-white">
        <h1 className="text-4xl font-bold">Custom printing made simple</h1>
        <p className="mt-3 text-blue-100">Business cards, flyers, banners, apparel, and more.</p>
        <Link to="/catalog" className="mt-6 inline-block rounded-full bg-white px-6 py-3 font-semibold text-blue-600">
          Shop products
        </Link>
      </section>
    </div>
  );
}
```

- [ ] **Step 5: Write the failing Catalog test — `frontend/src/__tests__/Catalog.test.jsx`**

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Catalog from '../pages/Catalog.jsx';

vi.mock('../api/catalog.js', () => ({
  fetchCategories: vi.fn(() => Promise.resolve([{ id: 1, name: 'Marketing', slug: 'marketing' }])),
  fetchProducts: vi.fn(() =>
    Promise.resolve({ products: [{ id: 10, name: 'Business Cards', slug: 'business-cards', basePrice: 19.99 }] })
  ),
}));

describe('Catalog page', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders products from the API', async () => {
    render(
      <MemoryRouter>
        <Catalog />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('Business Cards')).toBeInTheDocument());
    expect(screen.getByText('Marketing')).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run the test**

Run: `npm test -- Catalog`
Expected: PASS (1 test).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/ProductCard.jsx frontend/src/pages/Home.jsx frontend/src/pages/Catalog.jsx frontend/src/pages/Product.jsx frontend/src/__tests__/Catalog.test.jsx
git commit -m "feat(frontend): add home, catalog, and product pages"
```

---

## Task 13: Account page, ProtectedRoute, Navbar/Footer, wire up routes

**Files:**
- Create: `frontend/src/components/ProtectedRoute.jsx`, `frontend/src/components/Navbar.jsx`, `frontend/src/components/Footer.jsx`, `frontend/src/pages/Account.jsx`
- Modify: `frontend/src/App.jsx` (full routing), `frontend/src/main.jsx` (wrap in AuthProvider)
- Test: `frontend/src/__tests__/ProtectedRoute.test.jsx`

- [ ] **Step 1: Create `frontend/src/components/ProtectedRoute.jsx`**

```jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ children }) {
  const { token, loading } = useAuth();
  if (loading) return <p className="p-6">Loading…</p>;
  if (!token) return <Navigate to="/login" replace />;
  return children;
}
```

- [ ] **Step 2: Create `frontend/src/pages/Account.jsx`**

```jsx
import { useAuth } from '../context/AuthContext.jsx';

export default function Account() {
  const { user, logout } = useAuth();
  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-2xl font-bold">My account</h1>
      {user && (
        <dl className="space-y-2">
          <div><dt className="inline font-medium">Name: </dt><dd className="inline">{user.fullName}</dd></div>
          <div><dt className="inline font-medium">Email: </dt><dd className="inline">{user.email}</dd></div>
          <div><dt className="inline font-medium">Role: </dt><dd className="inline">{user.role}</dd></div>
        </dl>
      )}
      <button onClick={logout} className="mt-6 rounded bg-gray-800 px-4 py-2 text-white">Log out</button>
    </div>
  );
}
```

- [ ] **Step 3: Create `frontend/src/components/Navbar.jsx`**

```jsx
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { token } = useAuth();
  return (
    <nav className="flex items-center justify-between border-b px-6 py-4">
      <Link to="/" className="text-xl font-bold">Web2Print</Link>
      <div className="flex gap-4 text-sm">
        <Link to="/catalog">Catalog</Link>
        {token ? <Link to="/account">Account</Link> : <Link to="/login">Log in</Link>}
      </div>
    </nav>
  );
}
```

- [ ] **Step 4: Create `frontend/src/components/Footer.jsx`**

```jsx
export default function Footer() {
  return (
    <footer className="border-t px-6 py-8 text-center text-sm text-gray-500">
      © 2026 Web2Print. All rights reserved.
    </footer>
  );
}
```

- [ ] **Step 5: Replace `frontend/src/App.jsx` with full routing**

```jsx
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Home from './pages/Home.jsx';
import Catalog from './pages/Catalog.jsx';
import Product from './pages/Product.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Account from './pages/Account.jsx';

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/products/:slug" element={<Product />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <Account />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
```

- [ ] **Step 6: Wrap the app in `AuthProvider` — replace `frontend/src/main.jsx`**

```jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
```

- [ ] **Step 7: Update `frontend/src/__tests__/App.test.jsx`** (App now needs AuthProvider)

Replace its contents with:
```jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext.jsx';
import App from '../App.jsx';

describe('App', () => {
  it('renders the home hero', () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>
      </AuthProvider>
    );
    expect(screen.getByText('Custom printing made simple')).toBeInTheDocument();
  });
});
```

- [ ] **Step 8: Write the failing ProtectedRoute test — `frontend/src/__tests__/ProtectedRoute.test.jsx`**

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute.jsx';

let authValue = { token: null, loading: false };
vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => authValue,
}));

function renderAt(value) {
  authValue = value;
  return render(
    <MemoryRouter initialEntries={['/account']}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <div>Secret Account</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  it('redirects to login when there is no token', () => {
    renderAt({ token: null, loading: false });
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renders children when authenticated', () => {
    renderAt({ token: 'tok', loading: false });
    expect(screen.getByText('Secret Account')).toBeInTheDocument();
  });
});
```

- [ ] **Step 9: Run the full frontend suite**

Run: `npm test`
Expected: PASS — App, AuthContext, Login, Catalog, ProtectedRoute.

- [ ] **Step 10: Manual smoke test (both servers running)**

In `backend/`: `npm run seed` then `npm run dev`.
In `frontend/`: `npm run dev`, open the printed URL.
Verify: Home → Catalog shows seeded products → click a product → Register → redirected to Account → Log out → Account redirects to Login.

- [ ] **Step 11: Commit**

```bash
git add frontend/src
git commit -m "feat(frontend): add account, protected route, navbar/footer, full routing"
```

---

## Definition of Done (verify all)

- [ ] `cd backend && npm test` — all suites pass (health, db, auth, catalog).
- [ ] `cd frontend && npm test` — all suites pass.
- [ ] `npm run seed` (backend) populates categories + products without error.
- [ ] Both dev servers run; the manual smoke test in Task 13 Step 10 passes end-to-end.
- [ ] `.env.example` documents required env vars; `.env`, `.env.test` are gitignored.

## Notes for the next sub-project (Cart & Checkout)

- The `attributes` JSONB on products will drive option selection (size/paper/quantity) at add-to-cart time.
- `requireAuth` already attaches `req.user.role`; the admin guard for the future Admin Dashboard can build on it via a `requireRole('admin')` middleware.
```

