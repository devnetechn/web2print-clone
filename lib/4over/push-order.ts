import { createAdminClient } from "@/lib/supabase/server"
import { submitOrder, attachFilesToJob, type FourOverJob } from "@/lib/4over/client"

// The push to 4over used to live entirely inside the admin-only API route, so
// the only way to reach it was a signed-in admin clicking a button. The Stripe
// webhook has no session, so the logic lives here and both callers share it:
// app/api/print-providers/4over/submit-order/route.ts (manual, admin-gated)
// and app/api/webhooks/stripe/route.ts (automatic, on payment).

export type PushResult =
  | {
      success: true
      alreadySubmitted?: true
      fourOverOrderId: string | null
      jobIds: string[]
      // Submitting the order and attaching its artwork are two separate 4over
      // calls. The order can land while a file fails, and that combination is
      // the dangerous one - a job sitting in production with no artwork - so
      // it is reported rather than folded into success.
      fileWarnings: string[]
    }
  | { success: false; error: string }

export async function pushOrderToFourOver(orderId: string, profileToken: string): Promise<PushResult> {
  if (!profileToken) {
    return { success: false, error: "No payment profile provided" }
  }

  const admin = createAdminClient()

  const { data: order } = await admin
    .from("orders")
    .select("*, order_items (*)")
    .eq("id", orderId)
    .single()

  if (!order) {
    return { success: false, error: "Order not found" }
  }

  const fourOverItems = (order.order_items || []).filter(
    (item: any) => item.options?.productUuid && item.options?.colorspecUuid && item.options?.runsizeUuid,
  )

  if (fourOverItems.length === 0) {
    return { success: false, error: "Order has no 4over-eligible items" }
  }

  // Stripe retries a webhook whenever the handler is slow or returns non-2xx,
  // and a 4over submit takes ~30-50s, so a retry landing mid-push is likely
  // rather than theoretical. Without this an order would be submitted twice:
  // two charges against the client's card and two print jobs.
  const alreadyPushed = fourOverItems.filter((item: any) => item.provider_order_id)
  if (alreadyPushed.length > 0) {
    return {
      success: true,
      alreadySubmitted: true,
      fourOverOrderId: null,
      jobIds: alreadyPushed.map((i: any) => i.provider_order_id),
      fileWarnings: [],
    }
  }

  const addr = order.shipping_address || {}
  // Pickup orders still need a ship_to for 4over's own production-to-
  // storefront leg — ship to our own location in that case.
  const shipTo =
    addr.method === "pickup"
      ? {
          firstname: addr.firstName || "Web2Print",
          lastname: addr.lastName || "USA",
          phone: addr.mobileNumber || "8888436867",
          address: "7901 4th St. N #27125",
          city: "St. Petersburg",
          state: "FL",
          zipcode: "33702",
          country: "USA",
        }
      : {
          firstname: addr.firstName || "",
          lastname: addr.lastName || "",
          phone: addr.mobileNumber || "",
          company: addr.companyName || undefined,
          address: addr.address || "",
          city: addr.city || "",
          state: addr.state || "",
          zipcode: addr.postalCode || "",
          country: addr.country === "CA" ? "CAN" : "USA",
        }

  // Sandbox testing (verified against the live sandbox API) found:
  // - job_name must sit at the top level of the job, not nested under
  //   `files` as lib/4over/client.ts's FourOverJob comment suggests.
  // - Submitting `files` inline on the job 500s on 4over's side
  //   regardless of shape - skip_files + a separate POST /jobs/{id}/files
  //   call after submission is the path that actually works.
  // - 4over rejects the order outright ("must post a payment") without a
  //   payment.profile_token, even for is_test_order.
  // - The success response's job_ids is an OBJECT keyed by 4over's job
  //   ID, not an array - {"X123-001": {customer_job_id, status, ...}}.
  // The real carrier the customer was quoted and charged at checkout
  // (app/(storefront)/checkout/shipping/page.tsx), saved onto the order's
  // shipping_address. Pickup orders and any order placed before this was
  // added won't have it - "FREE UPS Ground"/"03f" (the example pair from
  // 4over's own docs, unconfirmed) is the last-resort fallback only.
  const shipper = addr.shippingCode
    ? { shipping_method: addr.shippingService || addr.shippingCode, shipping_code: addr.shippingCode }
    : { shipping_method: "FREE UPS Ground", shipping_code: "03f" }

  const jobs: FourOverJob[] = fourOverItems.map((item: any) => {
    const opts = item.options || {}
    return {
      product_uuid: opts.productUuid,
      runsize_uuid: opts.runsizeUuid,
      colorspec_uuid: opts.colorspecUuid,
      turnaroundtime_uuid: opts.turnaroundUuid || undefined,
      option_uuids: opts.optionUuids || [],
      dropship: false,
      job_name: item.product_name || `Item ${item.id}`,
      skip_files: true,
      ship_to: shipTo,
      shipper,
    }
  })

  // Real 4over orders (actual charges + production print/ship) are gated
  // behind an explicit env flag so TEST mode stays the safe default. Only
  // FOUROVER_LIVE_ORDERS=true (set once the funded 4over account is
  // verified) submits real orders — flipping it back needs no redeploy of
  // code, just the env var. Anything other than the literal "true" = test.
  const liveOrders = process.env.FOUROVER_LIVE_ORDERS === "true"

  const result = await submitOrder({
    order_id: order.order_number.toString(),
    is_test_order: !liveOrders,
    jobs,
    payment: { profile_token: profileToken },
  })

  if (!result.success || result.data?.order_status !== "Success") {
    const firstError = result.data?.errors?.[0]?.message?.description
    return { success: false, error: firstError || result.error || "4over rejected the order" }
  }

  // job_ids keys are 4over's job IDs; each value's customer_job_id echoes
  // back the job_name we sent, which is how each job is matched back to
  // the order_items row it came from (job_name was set to product_name).
  const jobIdEntries = Object.entries(result.data.job_ids || {}) as [string, { customer_job_id?: string }][]
  const fileWarnings: string[] = []

  for (const item of fourOverItems) {
    const match = jobIdEntries.find(([, v]) => v.customer_job_id === (item.product_name || `Item ${item.id}`))
    if (!match) continue
    const [jobId] = match

    let providerStatus = "submitted"

    if (item.design_file_url) {
      const attachResult = await attachFilesToJob(jobId, [{ fr: item.design_file_url }])
      if (!attachResult.success) {
        console.error(`[4over] Failed to attach file for job ${jobId}:`, attachResult.error)
        fileWarnings.push(`${item.product_name || jobId}: artwork upload failed (${attachResult.error})`)
        providerStatus = "submitted_no_artwork"
      }
    } else {
      fileWarnings.push(`${item.product_name || jobId}: no artwork was attached to this item`)
      providerStatus = "submitted_no_artwork"
    }

    await admin
      .from("order_items")
      .update({ provider_order_id: jobId, provider_status: providerStatus })
      .eq("id", item.id)
  }

  await admin.from("orders").update({ status: "production" }).eq("id", orderId)

  const jobIds = jobIdEntries.map(([id]) => id)
  await admin.from("order_status_logs").insert({
    order_id: orderId,
    status: "production",
    notes: [
      `Order submitted to 4over. Job IDs: ${jobIds.join(", ") || "(none)"}`,
      liveOrders ? "LIVE order — real charge and production." : "Test order — will not enter production.",
      ...fileWarnings.map((w) => `WARNING: ${w}`),
    ].join(" "),
  })

  return {
    success: true,
    fourOverOrderId: result.data.customer_order_id ?? null,
    jobIds,
    fileWarnings,
  }
}
