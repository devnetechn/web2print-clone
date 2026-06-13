# Web2Print — Foundation Design (User Accounts + Product Catalog)

**Date:** 2026-06-13
**Status:** Approved
**Sub-project:** 1 of 9 (Foundation)

## Context

Building a web-to-print e-commerce platform — a full clone of the
web2printusa.com model: customers browse print products (business cards,
flyers, banners, apparel, signs, packaging), customize them via templates,
and order them for printing and fulfillment.

The full platform is too large for a single spec. It is decomposed into 9
independent subsystems, each with its own spec → plan → implementation cycle.
This document covers **only the Foundation sub-project**: User Accounts +
Product Catalog. It also establishes the project scaffolding (structure, DB,
auth) that all later subsystems build on.

### Full decomposition & build order (reference)

1. **Foundation** — User Accounts + Product Catalog ← *this spec*
2. Cart & Checkout + Payments
3. Order Management + Admin Dashboard
4. Design Editor (template-based customization) — the web2print core
5. Real-time Chat (Socket.io) + CMS / Marketing pages

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | React.js + Tailwind CSS (Vite) |
| Backend | Node.js + Express.js |
| Database | PostgreSQL — **standard `pg` (node-postgres)**, raw SQL, no ORM |
| Real-time | Socket.io (later phase) |
| Auth | Email/password + JWT (`bcrypt` + `jsonwebtoken`) |
| Validation | zod |
| Testing | Vitest + Supertest (backend), Vitest + React Testing Library (frontend) |

## Scope (Foundation only)

**In scope:**
- User registration, login, current-user endpoint (JWT auth)
- `customer` / `admin` roles (schema + middleware ready; admin features later)
- Product catalog: categories (with hierarchy) and products, seeded in DB
- Public catalog browsing (category grid, product list with filter, product detail)
- Auth-gated account page (profile view)

**Out of scope (later subsystems):**
- Cart, checkout, payments
- Admin UI for managing products (catalog is DB-seeded for now)
- Design editor
- Order management, fulfillment
- Real-time chat, CMS pages

## Architecture

Frontend and backend are **separate apps** in a monorepo, communicating over a
REST JSON API (`http://localhost:5000/api`). CORS is locked to the frontend
origin.

```
web2print/
├── backend/                  Node + Express + pg
│   ├── src/
│   │   ├── config/           env loading
│   │   ├── db/
│   │   │   ├── pool.js        pg Pool (reads DATABASE_URL)
│   │   │   ├── migrate.js     runs migrations/*.sql in order
│   │   │   ├── migrations/
│   │   │   │   ├── 001_create_users.sql
│   │   │   │   ├── 002_create_categories.sql
│   │   │   │   └── 003_create_products.sql
│   │   │   └── seed.sql       sample categories + products
│   │   ├── middleware/        auth (JWT) · error handler · validation
│   │   ├── modules/
│   │   │   ├── auth/          routes · controller · service · repository
│   │   │   └── catalog/       routes · controller · service · repository
│   │   ├── app.js             express app (mounts routes, middleware)
│   │   └── server.js          starts HTTP server
│   └── package.json
└── frontend/                  React + Vite + Tailwind
    ├── src/
    │   ├── api/               axios client + endpoint functions
    │   ├── components/        Navbar, Footer, ProductCard, ...
    │   ├── context/           AuthContext (JWT + user state)
    │   ├── pages/             Home, Catalog, Product, Login, Register, Account
    │   └── App.jsx            React Router
    └── package.json
```

### Module responsibilities (backend)

Each module is a vertical slice with one clear purpose, communicating through
well-defined boundaries:

- **routes** — declares HTTP routes, applies middleware (validation, auth)
- **controller** — parses request, calls service, shapes HTTP response
- **service** — business logic, orchestrates repository calls
- **repository** — owns parameterized SQL queries against the `pg` pool

This lets each layer be understood and tested independently.

## Data Model

SQL migrations (raw DDL). Types:

```sql
-- 001_create_users.sql
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'customer'
                  CHECK (role IN ('customer','admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 002_create_categories.sql
CREATE TABLE categories (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  description TEXT,
  image_url   TEXT,
  parent_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL
);

-- 003_create_products.sql
CREATE TABLE products (
  id          SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  description TEXT,
  base_price  NUMERIC(10,2) NOT NULL,
  image_url   TEXT,
  attributes  JSONB NOT NULL DEFAULT '{}',  -- e.g. sizes, paper types, quantities
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

`attributes` is `JSONB` so product options (size, paper, finish, quantity
tiers) can vary per product without schema changes. `seed.sql` inserts sample
categories (e.g. Marketing, Apparel, Signs & Banners) and products (Business
Cards, Flyers, Banners, T-Shirts).

## Backend API

### Auth
| Method | Path | Body / Notes | Returns |
|--------|------|--------------|---------|
| POST | `/api/auth/register` | `email`, `password`, `fullName` | JWT + user (no hash) |
| POST | `/api/auth/login` | `email`, `password` | JWT + user |
| GET | `/api/auth/me` | `Authorization: Bearer <jwt>` | current user |

- Passwords hashed with `bcrypt`. Hash never returned.
- JWT signed with secret from `.env`, contains `{ userId, role }`.
- `GET /me` is protected by JWT middleware.

### Catalog (public)
| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/categories` | list; supports parent/child hierarchy |
| GET | `/api/products` | list; `?category=<slug>` filter, pagination (`page`, `limit`) |
| GET | `/api/products/:slug` | single product detail |

- Input validated with **zod** (request body/query schemas).

### Middleware
- **auth** — verifies JWT, attaches `req.user = { userId, role }`; 401 if missing/invalid. (Role available now for future admin guards.)
- **validation** — runs zod schema, 400 with field errors on failure.
- **error** — central handler → consistent JSON `{ error: { message, code } }`.

## Frontend

### Pages
- **Home** — landing with featured categories/products.
- **Catalog** — category grid + product list, filter by category.
- **Product** — detail view (image, description, price, attributes).
- **Login / Register** — auth forms.
- **Account** — profile view (protected; redirects to login if no token).

### State & data
- **AuthContext** — holds JWT (localStorage) + user; exposes
  `login` / `logout` / `register`; an axios interceptor injects the
  `Authorization` header.
- **Routing** — React Router; catalog pages public, `/account` protected.
- **Styling** — Tailwind, mobile-first, responsive, accessible (semantic HTML,
  labels, focus states).

## Error Handling & Security

- Central Express error middleware → consistent JSON error shape.
- Passwords bcrypt-hashed; never serialized in responses.
- JWT secret in `.env` (gitignored); tokens carry minimal claims.
- All endpoints validate input via zod.
- All SQL is parameterized (`$1, $2 ...`) — no string interpolation.
- CORS restricted to the frontend origin.
- Basic rate limiting on auth routes.

## Testing (TDD — test-first)

- **Backend:** Vitest + Supertest integration tests against a test database:
  - Auth: register → login → `/me` happy path; duplicate email; bad password; unauthorized `/me`.
  - Catalog: list categories, list products, filter by category, product detail, 404 for unknown slug.
- **Frontend:** Vitest + React Testing Library:
  - Login form (submit, error display), product list rendering, protected-route redirect.

## Definition of Done

- Migrations + seed run cleanly against a fresh PostgreSQL database.
- Register/login/me work end-to-end with JWT.
- Catalog endpoints return seeded data with filtering and pagination.
- Frontend: browse catalog, view product, register/login, view account.
- All tests pass.
- `.env.example` documents required environment variables.
