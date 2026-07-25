# Sign-Up Rate Limiting

**Date:** 2026-07-14
**Scope:** Storefront customer account creation (`app/(storefront)/account/sign-up/page.tsx`)
**Goal:** Prevent a single IP from creating unlimited accounts via the email/password sign-up form.

---

## Background

The storefront sign-up page calls `supabase.auth.signUp()` directly from the client with no server-side gate in front of it. Nothing stops a script from hammering the form with random emails. Boss Dwayne wants rate limiting added to account creation.

A second, older sign-up page exists at `app/auth/sign-up/page.tsx` (no CRM hand-off, redirects to `/admin`). Confirmed out of scope for this change — only the storefront page (`account/sign-up`) is covered.

The project has no Redis/Upstash/Vercel KV — Supabase Postgres is the only durable store already wired up, so the rate limit counter lives there instead of pulling in a new service.

---

## Approach

Server-side rate limiting keyed by **IP address**, checked via a new Server Action before the client calls `supabase.auth.signUp()`. Google/Facebook OAuth sign-up is **not** covered — those require a real third-party account, which is a much higher bar for abuse than free-form email/password.

**Limit:** 3 sign-up attempts per IP per rolling 1-hour window.

Files changed:
- `scripts/018_signup_rate_limiting.sql` — new table + RLS
- `app/actions/rate-limit.ts` — new Server Action, `checkSignupRateLimit()`
- `app/(storefront)/account/sign-up/page.tsx` — calls the check before `supabase.auth.signUp()`

---

## Data Layer

### Supabase table: `signup_rate_limits`

```sql
CREATE TABLE public.signup_rate_limits (
  id BIGSERIAL PRIMARY KEY,
  ip_address TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX signup_rate_limits_ip_created_idx
  ON public.signup_rate_limits (ip_address, created_at);
```

Each row = one sign-up attempt from one IP. No update, only insert + delete.

### RLS

`ALTER TABLE public.signup_rate_limits ENABLE ROW LEVEL SECURITY;` with **no policies** — matches the pattern in `scripts/013_security_hardening.sql` (e.g. `coupons`). The anon/authenticated client can't read or write this table at all; only the service-role admin client (`createAdminClient()` from `lib/supabase/server.ts`) touches it.

---

## Server Action

**File:** `app/actions/rate-limit.ts`

```ts
"use server"

export async function checkSignupRateLimit(): Promise<
  { allowed: true } | { allowed: false; retryAfterMinutes: number }
>
```

Logic:
1. Read the caller's IP from `headers()` — first entry of `x-forwarded-for`, falling back to `x-real-ip`, falling back to the literal string `"unknown"` (local dev without a proxy in front).
2. Using the admin client:
   - Delete rows for that IP older than 1 hour (opportunistic cleanup — keeps the table small without a cron job).
   - Count remaining rows for that IP.
3. If count `>= 3`:
   - Return `{ allowed: false, retryAfterMinutes }`, where `retryAfterMinutes` is computed from the oldest remaining row's `created_at` (time until it ages out of the 1-hour window, rounded up).
4. Else:
   - Insert a new row `{ ip_address }`.
   - Return `{ allowed: true }`.

The `"unknown"` fallback bucket is shared by all requests that have no proxy headers (local dev only — Vercel always sets `x-forwarded-for` in production), so it can rate-limit unrelated local requests against each other. Accepted since it never occurs in production.

---

## Client Integration

**File:** `app/(storefront)/account/sign-up/page.tsx`, inside `handleSignUp`:

```ts
const limitCheck = await checkSignupRateLimit()
if (!limitCheck.allowed) {
  setError(`Too many sign-up attempts. Please try again in ${limitCheck.retryAfterMinutes} minute(s).`)
  setIsLoading(false)
  return
}
```

Placed as the first step inside the existing `try` block, before the `supabase.auth.signUp()` call. Everything after it (signUp, CRM hand-off, redirect) is unchanged. The OAuth handlers (`handleOAuth`) are untouched.

---

## What Does NOT Change

- `app/auth/sign-up/page.tsx` (legacy/admin sign-up) — not covered, out of scope for now.
- Google/Facebook OAuth sign-up flow — not rate-limited.
- `supabase.auth.signUp()` call itself, CRM hand-off (`sendNewCustomerToCRM`), and post-signup redirect — unchanged.
- Login page — not covered, this task is sign-up only.

---

## Out of Scope

- Rate limiting the legacy `app/auth/sign-up/page.tsx` page.
- Rate limiting OAuth-based sign-up.
- Rate limiting login attempts (separate concern from account creation).
- CAPTCHA or other bot-detection mechanisms.
- Supabase's own built-in auth rate limit settings (dashboard-level config, not app code) — this spec only covers an app-level gate in front of the existing flow.
