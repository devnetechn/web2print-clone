import { createClient, createAdminClient } from "@/lib/supabase/server"
import { submitOrder, attachFilesToJob, getPaymentProfiles, type FourOverJob } from "@/lib/4over/client"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check admin permission
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

    const body = await request.json()
    const { orderId } = body

    const admin = createAdminClient()

    // Get order details
    const { data: order } = await admin
      .from("orders")
      .select(
        `
        *,
        order_items (*)
      `,
      )
      .eq("id", orderId)
      .single()

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const fourOverItems = (order.order_items || []).filter(
      (item: any) => item.options?.productUuid && item.options?.colorspecUuid && item.options?.runsizeUuid,
    )

    if (fourOverItems.length === 0) {
      return NextResponse.json({ error: "Order has no 4over-eligible items" }, { status: 400 })
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
        // No confirmed real shipping_code from 4over's sandbox yet -
        // "FREE UPS Ground" / "03f" is the example pair from their own
        // docs (see FourOverJob's comment in lib/4over/client.ts).
        shipper: { shipping_method: "FREE UPS Ground", shipping_code: "03f" },
      }
    })

    const profilesResult = await getPaymentProfiles()
    const profileToken = profilesResult.data?.entities?.[0]?.profile_token
    if (!profileToken) {
      return NextResponse.json({ error: "No 4over payment profile is configured" }, { status: 502 })
    }

    const result = await submitOrder({
      order_id: order.order_number.toString(),
      is_test_order: true,
      jobs,
      payment: { profile_token: profileToken },
    })

    if (!result.success || result.data?.order_status !== "Success") {
      const firstError = result.data?.errors?.[0]?.message?.description
      return NextResponse.json({ error: firstError || result.error || "4over rejected the order" }, { status: 502 })
    }

    // job_ids keys are 4over's job IDs; each value's customer_job_id echoes
    // back the job_name we sent, which is how each job is matched back to
    // the order_items row it came from (job_name was set to product_name).
    const jobIdEntries = Object.entries(result.data.job_ids || {}) as [string, { customer_job_id?: string }][]

    for (const item of fourOverItems) {
      const match = jobIdEntries.find(([, v]) => v.customer_job_id === (item.product_name || `Item ${item.id}`))
      if (!match) continue
      const [jobId] = match

      if (item.design_file_url) {
        const attachResult = await attachFilesToJob(jobId, [{ fr: item.design_file_url }])
        if (!attachResult.success) {
          console.error(`[4over] Failed to attach file for job ${jobId}:`, attachResult.error)
        }
      }

      await admin
        .from("order_items")
        .update({ provider_order_id: jobId, provider_status: "submitted" })
        .eq("id", item.id)
    }

    const fourOverOrderId = result.data.customer_order_id

    await admin
      .from("orders")
      .update({
        status: "production",
      })
      .eq("id", orderId)

    await admin.from("order_status_logs").insert({
      order_id: orderId,
      status: "production",
      notes: `Order submitted to 4over. Job IDs: ${jobIdEntries.map(([id]) => id).join(", ") || "(none)"}`,
    })

    return NextResponse.json({
      success: true,
      fourOverOrderId,
      jobIds: jobIdEntries.map(([id]) => id),
      message: "Order successfully submitted to 4over",
    })
  } catch (error) {
    console.error("[v0] Error submitting order to 4over:", error)
    return NextResponse.json({ error: "Failed to submit order to 4over" }, { status: 500 })
  }
}
