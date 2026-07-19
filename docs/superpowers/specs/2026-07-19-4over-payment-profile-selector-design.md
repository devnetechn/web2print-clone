# 4over Payment Profile Selector

**Date:** 2026-07-19
**Scope:** Admin push-to-4over flow (`app/admin/orders/4over-transfer/page.tsx`, `app/api/print-providers/4over/submit-order/route.ts`)
**Goal:** Let the admin see and choose which of Boss's saved 4over payment profiles (cards) to charge when pushing an order, instead of the code silently always using the first one.

---

## Background

`submitOrder()` in `lib/4over/client.ts` requires a `payment.profile_token` from `GET /paymentprofiles` — 4over rejects orders without one, even test orders. Today, `app/api/print-providers/4over/submit-order/route.ts:109-110` calls `getPaymentProfiles()` and blindly takes `entities?.[0]?.profile_token` with no admin visibility into what that is.

Confirmed live against the real 4over account (2026-07-19): `GET /paymentprofiles` returns 12 profiles — 10 real Visa cards, 1 E-Check, and 1 "Dummy" test card (`profile_token: "1010101010"`). The Dummy entry is entry `[0]`, so every push today silently uses the dummy profile, never a real saved card. Boss Wayne explicitly asked (chat, 2026-07-19) for saved cards to be visible/selectable during push — this closes that gap.

End-to-end push/sync/cancel was already verified working against the live API in this same session (order #7, job `X6599021873-001`) — this spec only changes *which* payment profile gets sent, not the submit/sync/cancel mechanics themselves.

---

## Approach

Minimal inline addition to the existing transfer page — no new "payment profiles" management page, no shared component (YAGNI: only one consumer exists today).

Files changed:
- `app/api/print-providers/4over/payment-profiles/route.ts` — new GET route
- `app/admin/orders/4over-transfer/page.tsx` — add card dropdown + wire into submit
- `app/api/print-providers/4over/submit-order/route.ts` — accept `profileToken` from the request instead of picking `entities[0]`

---

## New API Route: list payment profiles

**File:** `app/api/print-providers/4over/payment-profiles/route.ts`

```ts
GET /api/print-providers/4over/payment-profiles
```

- Same admin-auth check as `submit-order/route.ts` (`profile.is_admin`, 401/403 on failure)
- Calls `getPaymentProfiles()` from `lib/4over/client.ts` server-side — keeps `FOUROVER_API_SECRET` off the browser
- On success: `{ profiles: [{ profile_token, last_four, valid_thru, type }, ...] }` (pass the `entities` array through as-is)
- On failure: `{ error: string }` with a non-200 status

---

## UI Change: card dropdown

**File:** `app/admin/orders/4over-transfer/page.tsx` (currently a client component)

- On mount, `fetch("/api/print-providers/4over/payment-profiles")` once; store `profiles`, `profilesError`, `profilesLoading` in state
- Render a `<Select>` (shadcn, same component already used in `products/category/[slug]/page.tsx`) between the Order ID input and the Submit button, in the "Submit Order to 4over" card only (Sync Status card is unaffected)
- Each option label: `${type} •••• ${last_four}` + `— exp ${valid_thru}` when present (E-Check/Dummy may lack `valid_thru`); the Dummy entry additionally gets a trailing `(Test)` tag so it reads as `Dummy •••• 1111 (Test)`
- No pre-selected/default option — starts empty
- "Submit to 4over" button disabled when `isSubmitting`, OR `orderId` is empty, OR no card selected (extends the existing disabled condition)
- If `profilesError` is set: show an inline error message in place of the dropdown plus a "Retry" button that re-fetches; Submit stays disabled while profiles failed to load
- On successful submit, clear both `orderId` and the selected card (matches existing `setOrderId("")` reset behavior)

---

## Backend Change: submit-order route

**File:** `app/api/print-providers/4over/submit-order/route.ts`

- Request body gains `profileToken: string` alongside the existing `orderId`
- Remove the `getPaymentProfiles()` call and the `entities?.[0]?.profile_token` fallback entirely (lines 109-113)
- Validate `profileToken` is present: `400 { error: "No payment profile selected" }` if missing
- Use the client-provided `profileToken` directly in the `submitOrder({ ..., payment: { profile_token: profileToken } })` call

This makes the route strictly require an explicit profile token from the caller — there is no server-side default anymore, matching the earlier decision that admin must actively pick a card every time.

---

## What Does NOT Change

- `submitOrder()`, `attachFilesToJob()`, `getPaymentProfiles()` in `lib/4over/client.ts` — untouched, only how their results are consumed changes
- `is_test_order: true` stays hardcoded in `submit-order/route.ts` — this spec does not touch the test-vs-real-order question (separate decision, deferred until Boss is present)
- Sync Status card / `sync-status` route — unaffected, no payment profile involved there
- No caching of the profile list — fetched fresh on every page load so newly-saved cards on 4over's side show up immediately, matching Boss's ask

---

## Out of Scope

- A standalone "Payment Profiles" admin management page
- Persisting the admin's card choice per-order in the database (chosen fresh each push, not remembered)
- Adding/removing/editing payment profiles from this app (cards are managed on 4over.com directly; this app only reads and picks)
- Card selection on the individual order detail page (`/admin/orders/[id]`) — that page still just links out to the transfer page
- Flipping `is_test_order` to `false` for real charges — separate, explicitly deferred decision
