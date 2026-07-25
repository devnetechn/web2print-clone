# 4over Payment Profile Selector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the admin see and pick which saved 4over payment profile (card) to charge when pushing an order to 4over, instead of the backend silently always using the first profile returned by 4over's API (which is a "Dummy" test card, not a real one).

**Architecture:** One new admin-only GET route exposes `getPaymentProfiles()` (already in `lib/4over/client.ts`) to the browser. The existing `/admin/orders/4over-transfer` page fetches that list on mount and renders it as a `<Select>` dropdown. The existing submit-order route stops calling `getPaymentProfiles()` itself and instead requires the caller to supply `profileToken` in the request body.

**Tech Stack:** Next.js App Router (route handlers + client component), Supabase (auth check pattern already used in `submit-order/route.ts`), shadcn/Radix `Select` component (`components/ui/select.tsx`, already used elsewhere in the codebase).

## Global Constraints

- No test framework is configured in this repo (no `jest`/`vitest`, no `test` script in `package.json`, no existing `*.test.*` files anywhere). Do **not** introduce one as part of this plan — verification steps below use the same manual, browser-driven method already used to validate this exact push/sync/cancel flow earlier in this session: log into `/admin` as `wayne@web2printusa.com` and drive the page directly.
- `is_test_order: true` stays hardcoded in `submit-order/route.ts` — out of scope, per the design doc.
- No default/pre-selected card in the dropdown — the admin must actively choose one every time.
- The "Dummy" profile (`type: "Dummy"`) must remain selectable, just visually tagged `(Test)`.
- Dev server is expected to already be running on `http://localhost:3000` (`npm run dev`). If not, start it before the verification steps.

---

### Task 1: Payment profiles API route

**Files:**
- Create: `app/api/print-providers/4over/payment-profiles/route.ts`

**Interfaces:**
- Consumes: `getPaymentProfiles()` from `lib/4over/client.ts` — returns `Promise<{ success: boolean; data?: { entities: any[] }; error?: string }>` (already exists, unchanged)
- Produces: `GET /api/print-providers/4over/payment-profiles` → `200 { profiles: Array<{ profile_token: string; last_four: string; valid_thru?: string; type: string }> }` on success, or `{ error: string }` with a non-200 status on failure. Task 3 consumes this exact shape.

- [ ] **Step 1: Create the route file**

```ts
import { createClient } from "@/lib/supabase/server"
import { getPaymentProfiles } from "@/lib/4over/client"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const result = await getPaymentProfiles()

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to fetch payment profiles" }, { status: 502 })
    }

    return NextResponse.json({ profiles: result.data?.entities || [] })
  } catch (error) {
    console.error("[4over] Error fetching payment profiles:", error)
    return NextResponse.json({ error: "Failed to fetch payment profiles" }, { status: 500 })
  }
}
```

This mirrors the exact admin-auth check already used in `app/api/print-providers/4over/submit-order/route.ts:9-22`.

- [ ] **Step 2: Verify unauthenticated access is blocked**

With the dev server running and **not** logged into `/admin` in the browser (use a fresh Playwright context, or navigate to `/auth/logout` first if the session from earlier in this conversation is still active), navigate the browser directly to:

```
http://localhost:3000/api/print-providers/4over/payment-profiles
```

Expected: page body shows `{"error":"Unauthorized"}`.

- [ ] **Step 3: Verify authenticated admin access returns real data**

Log in at `http://localhost:3000/auth/login` with `wayne@web2printusa.com` / `changeme123`, then navigate the browser directly to the same URL again.

Expected: JSON body of the shape `{"profiles":[{...}, {...}, ...]}` where each entry has `profile_token`, `last_four`, and `type` keys (some entries also have `valid_thru`). Do not assert an exact count — the list is live data from 4over and can change.

- [ ] **Step 4: Commit**

```bash
git add app/api/print-providers/4over/payment-profiles/route.ts
git commit -m "feat(4over): add admin route to list saved payment profiles"
```

---

### Task 2: Require an explicit payment profile in submit-order

**Files:**
- Modify: `app/api/print-providers/4over/submit-order/route.ts`

**Interfaces:**
- Consumes: request body now includes `profileToken: string` (in addition to the existing `orderId: string`) — Task 3 is the producer of this field from the browser.
- Produces: unchanged response shape (`{ success: true, fourOverOrderId, jobIds, message }` or `{ error }`), just a new `400` case.

- [ ] **Step 1: Remove the `getPaymentProfiles` import and destructure `profileToken` from the body**

In `app/api/print-providers/4over/submit-order/route.ts`, change line 2:

```ts
import { submitOrder, attachFilesToJob, getPaymentProfiles, type FourOverJob } from "@/lib/4over/client"
```
to:
```ts
import { submitOrder, attachFilesToJob, type FourOverJob } from "@/lib/4over/client"
```

Change line 25:
```ts
    const { orderId } = body
```
to:
```ts
    const { orderId, profileToken } = body
```

- [ ] **Step 2: Replace the `entities[0]` lookup with a required-field check**

Replace this block (current lines 109-113):
```ts
    const profilesResult = await getPaymentProfiles()
    const profileToken = profilesResult.data?.entities?.[0]?.profile_token
    if (!profileToken) {
      return NextResponse.json({ error: "No 4over payment profile is configured" }, { status: 502 })
    }
```
with:
```ts
    if (!profileToken) {
      return NextResponse.json({ error: "No payment profile selected" }, { status: 400 })
    }
```

The `submitOrder({ ..., payment: { profile_token: profileToken } })` call right after this block is unchanged — it already references the `profileToken` variable, which now comes from the request body instead of a live lookup.

- [ ] **Step 3: Verify the 400 case**

With the dev server running, log into `/admin` (`wayne@web2printusa.com` / `changeme123`) if not already, then use the browser's JS console via `browser_evaluate` (or the Playwright `browser_evaluate` tool) on any admin page to run:

```js
fetch("/api/print-providers/4over/submit-order", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ orderId: "9804a5fd-5ce4-42fc-99c6-cd2b7a9c41c8" }),
}).then((r) => r.json())
```

Expected: `{"error":"No payment profile selected"}` (no `profileToken` was sent).

- [ ] **Step 4: Verify the happy path still works with an explicit token**

Re-run `npm run build` to confirm no TypeScript/compile regressions (the project has `typescript.ignoreBuildErrors: true` in `next.config.mjs`, so this only catches syntax/module errors, not type errors):

```bash
npm run build
```

Expected: `✓ Compiled successfully`, matching the clean build already confirmed for this project earlier in this session.

Then, using order #6 (`0951c57a-24bb-4980-bf46-e8dc29a85cf1` — paid? no, it's `pending`/`unpaid` per the DB check done earlier this session; use whichever currently-paid, not-yet-pushed order exists — re-check with the same Supabase query pattern used earlier in this session if #6's status has changed) and a real profile token from Task 1's Step 3 output (pick any non-Dummy Visa entry), run via `browser_evaluate`:

```js
fetch("/api/print-providers/4over/submit-order", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ orderId: "<a paid, not-yet-pushed order id>", profileToken: "<a real profile_token>" }),
}).then((r) => r.json())
```

Expected: `{"success":true,"fourOverOrderId":...,"jobIds":[...],"message":"Order successfully submitted to 4over"}` — same shape as the successful push already verified for order #7 earlier in this session. Since `is_test_order: true` is still hardcoded, this remains a test push (no real charge, no real production job), safe to leave as-is or cancel afterward the same way order #7's job was canceled (`cancelOrder(jobId)` from `lib/4over/client.ts`, or the raw `DELETE /orders/{job_id}` call pattern used earlier this session).

- [ ] **Step 5: Commit**

```bash
git add app/api/print-providers/4over/submit-order/route.ts
git commit -m "fix(4over): require explicit payment profile instead of defaulting to entities[0]"
```

---

### Task 3: Card dropdown on the transfer page

**Files:**
- Modify: `app/admin/orders/4over-transfer/page.tsx`

**Interfaces:**
- Consumes: `GET /api/print-providers/4over/payment-profiles` (Task 1) → `{ profiles: Array<{ profile_token: string; last_four: string; valid_thru?: string; type: string }> }`; `POST /api/print-providers/4over/submit-order` (Task 2) now requires `profileToken` in its body.
- Produces: nothing consumed by later tasks (this is the last task).

- [ ] **Step 1: Add imports and the `PaymentProfile` type**

At the top of `app/admin/orders/4over-transfer/page.tsx`, change:
```tsx
"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Send, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
```
to:
```tsx
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Send, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

type PaymentProfile = {
  profile_token: string
  last_four: string
  valid_thru?: string
  type: string
}
```

- [ ] **Step 2: Add state and the fetch-profiles function**

Change:
```tsx
export default function FourOverTransferPage() {
  const [orderId, setOrderId] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const { toast } = useToast()
```
to:
```tsx
export default function FourOverTransferPage() {
  const [orderId, setOrderId] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [profiles, setProfiles] = useState<PaymentProfile[]>([])
  const [profilesLoading, setProfilesLoading] = useState(true)
  const [profilesError, setProfilesError] = useState<string | null>(null)
  const [selectedProfileToken, setSelectedProfileToken] = useState("")
  const { toast } = useToast()

  const fetchProfiles = async () => {
    setProfilesLoading(true)
    setProfilesError(null)
    try {
      const response = await fetch("/api/print-providers/4over/payment-profiles")
      const data = await response.json()
      if (response.ok) {
        setProfiles(data.profiles || [])
      } else {
        setProfilesError(data.error || "Failed to load payment profiles")
      }
    } catch {
      setProfilesError("Failed to load payment profiles")
    } finally {
      setProfilesLoading(false)
    }
  }

  useEffect(() => {
    fetchProfiles()
  }, [])
```

- [ ] **Step 3: Require a selected profile and send it, resetting on success**

Change `handleSubmitOrder` from:
```tsx
  const handleSubmitOrder = async () => {
    if (!orderId) {
      toast({
        title: "Error",
        description: "Please enter an order ID",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/print-providers/4over/submit-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: `Order submitted to 4over. Order ID: ${data.fourOverOrderId}`,
        })
        setOrderId("")
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to submit order",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit order to 4over",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }
```
to:
```tsx
  const handleSubmitOrder = async () => {
    if (!orderId) {
      toast({
        title: "Error",
        description: "Please enter an order ID",
        variant: "destructive",
      })
      return
    }

    if (!selectedProfileToken) {
      toast({
        title: "Error",
        description: "Please select a payment profile",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/print-providers/4over/submit-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, profileToken: selectedProfileToken }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: `Order submitted to 4over. Order ID: ${data.fourOverOrderId}`,
        })
        setOrderId("")
        setSelectedProfileToken("")
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to submit order",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit order to 4over",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }
```

- [ ] **Step 4: Render the dropdown and update the disabled condition**

Change:
```tsx
            <div>
              <Input
                placeholder="Enter Order ID"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="mb-4"
              />
              <Button onClick={handleSubmitOrder} disabled={isSubmitting} className="w-full gap-2">
                <Send className="h-4 w-4" />
                {isSubmitting ? "Submitting..." : "Submit to 4over"}
              </Button>
            </div>
```
to:
```tsx
            <div>
              <Input
                placeholder="Enter Order ID"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="mb-4"
              />

              {profilesError ? (
                <div className="mb-4 flex items-center justify-between rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  <span>{profilesError}</span>
                  <Button variant="outline" size="sm" onClick={fetchProfiles}>
                    Retry
                  </Button>
                </div>
              ) : (
                <Select value={selectedProfileToken} onValueChange={setSelectedProfileToken} disabled={profilesLoading}>
                  <SelectTrigger className="w-full mb-4">
                    <SelectValue placeholder={profilesLoading ? "Loading cards..." : "Select a payment profile"} />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((p) => (
                      <SelectItem key={p.profile_token} value={p.profile_token}>
                        {p.type} •••• {p.last_four}
                        {p.valid_thru ? ` — exp ${p.valid_thru}` : ""}
                        {p.type === "Dummy" ? " (Test)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Button
                onClick={handleSubmitOrder}
                disabled={isSubmitting || !orderId || !selectedProfileToken || profilesLoading || !!profilesError}
                className="w-full gap-2"
              >
                <Send className="h-4 w-4" />
                {isSubmitting ? "Submitting..." : "Submit to 4over"}
              </Button>
            </div>
```

- [ ] **Step 5: Build check**

```bash
npm run build
```

Expected: `✓ Compiled successfully`, and `/admin/orders/4over-transfer` still listed in the route output.

- [ ] **Step 6: End-to-end browser verification**

With the dev server running:
1. Log into `/admin` as `wayne@web2printusa.com` / `changeme123` (skip if the session from earlier in this conversation is still active).
2. Navigate to `/admin/orders/4over-transfer`.
3. Confirm the dropdown populates with entries like `Visa •••• 7333 — exp 07/26` and one entry reading `Dummy •••• 1111 (Test)`.
4. Confirm the "Submit to 4over" button is disabled until both the Order ID field and the dropdown have values.
5. Fill in a currently-paid, not-yet-pushed order's UUID (re-check which order qualifies with the same Supabase query approach used earlier this session, since order #7 is now already pushed-and-canceled), select a real (non-Dummy) Visa profile, and click "Submit to 4over".
6. Confirm a success toast appears and both the Order ID field and dropdown selection clear.
7. Immediately cancel the resulting job the same way job `X6599021873-001` was canceled earlier this session (`DELETE /orders/{job_id}` via `cancelOrder()`, since this is still a test-order push), to avoid leaving a dangling test job.

- [ ] **Step 7: Commit**

```bash
git add "app/admin/orders/4over-transfer/page.tsx"
git commit -m "feat(4over): add payment profile selector to the transfer page"
```

---

## Self-Review Notes

- **Spec coverage:** New route (Task 1) ✅, dropdown UI with no default + Dummy labeled "Test" + disabled-until-both-filled (Task 3) ✅, submit-order requiring explicit `profileToken` with no `entities[0]` fallback (Task 2) ✅, no caching / fresh fetch on mount (Task 3 Step 2, no memoization) ✅, out-of-scope items (standalone profiles page, per-order persistence, add/edit/remove profiles, individual order page UI, `is_test_order` flip) not touched by any task ✅.
- **Type consistency:** `PaymentProfile` type defined once in Task 3 Step 1, used consistently in `profiles` state and the `.map()` in Step 4; matches the route's response shape from Task 1.
- **No placeholders:** all steps show complete, exact code — no "add validation here" style gaps.
