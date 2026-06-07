import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { 
  submitOrder, 
  getOrderStatus, 
  getTracking, 
  cancelOrder,
  attachFilesToJob,
  getPaymentProfiles
} from "@/lib/4over/client"

// GET - Get orders from database, order status, tracking, or payment profiles
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get("action")
  const jobId = searchParams.get("job_id")
  
  try {
    // Get payment profiles from 4over
    if (action === "payment-profiles") {
      const result = await getPaymentProfiles()
      return NextResponse.json(result.success ? { success: true, data: result.data } : { success: false, error: result.error })
    }
    
    // Get order status from 4over
    if (action === "status" && jobId) {
      const result = await getOrderStatus(jobId)
      return NextResponse.json(result.success ? { success: true, data: result.data } : { success: false, error: result.error })
    }
    
    // Get tracking info from 4over
    if (action === "tracking" && jobId) {
      const result = await getTracking(jobId)
      return NextResponse.json(result.success ? { success: true, data: result.data } : { success: false, error: result.error })
    }
    
    // Default: Get orders from local database
    const supabase = await createClient()
    const { data: orders, error } = await supabase
      .from("fourover_orders")
      .select("*")
      .order("created_at", { ascending: false })
    
    if (error) {
      return NextResponse.json({ orders: [], error: error.message })
    }
    
    return NextResponse.json({ orders: orders || [] })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// POST - Submit new order to 4over
// Per docs: POST /orders with order_id, jobs array, and optional payment
export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Validate required fields per 4over documentation
    if (!body.order_id) {
      return NextResponse.json({ error: "order_id is required" }, { status: 400 })
    }
    if (!body.jobs || !Array.isArray(body.jobs) || body.jobs.length === 0) {
      return NextResponse.json({ error: "jobs array is required with at least one job" }, { status: 400 })
    }
    
    // Validate each job has required fields
    for (const job of body.jobs) {
      if (!job.product_uuid) {
        return NextResponse.json({ error: "Each job requires product_uuid" }, { status: 400 })
      }
      if (!job.runsize_uuid) {
        return NextResponse.json({ error: "Each job requires runsize_uuid" }, { status: 400 })
      }
      if (!job.colorspec_uuid) {
        return NextResponse.json({ error: "Each job requires colorspec_uuid" }, { status: 400 })
      }
      if (!job.ship_to) {
        return NextResponse.json({ error: "Each job requires ship_to address" }, { status: 400 })
      }
      if (!job.shipper) {
        return NextResponse.json({ error: "Each job requires shipper (shipping_method and shipping_code)" }, { status: 400 })
      }
      // option_uuids is required but can be empty array
      if (!Array.isArray(job.option_uuids)) {
        job.option_uuids = []
      }
    }
    
    // Submit order to 4over
    const result = await submitOrder({
      order_id: body.order_id,
      is_test_order: body.is_test_order || false,
      display_breakdown_prices: body.display_breakdown_prices || "job",
      coupon_code: body.coupon_code,
      skip_conformation: body.skip_conformation !== false, // Default true
      jobs: body.jobs,
      payment: body.payment
    })
    
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }
    
    // Save order to local database
    const supabase = await createClient()
    await supabase.from("fourover_orders").insert({
      order_id: body.order_id,
      fourover_response: result.data,
      status: result.data.order_status,
      job_ids: result.data.job_ids,
      created_at: new Date().toISOString()
    })
    
    return NextResponse.json({
      success: true,
      order_status: result.data.order_status,
      customer_order_id: result.data.customer_order_id,
      job_ids: result.data.job_ids,
      payment_response: result.data.payment_response,
      job_cost_breakdown: result.data.job_cost_breakdown,
      errors: result.data.errors
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// DELETE - Cancel an order/job
// Per docs: DELETE /orders/{job_id} - Can only cancel before "Batch Imposition" status
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const jobId = searchParams.get("job_id")
  
  if (!jobId) {
    return NextResponse.json({ error: "job_id is required" }, { status: 400 })
  }
  
  try {
    const result = await cancelOrder(jobId)
    
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: result.data === true ? "Order canceled successfully" : result.data
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// PATCH - Attach files to a job placed with skip_files=true
// Per docs: POST /jobs/{job_id}/files
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { job_id, files } = body
    
    if (!job_id) {
      return NextResponse.json({ error: "job_id is required" }, { status: 400 })
    }
    if (!files || !Array.isArray(files)) {
      return NextResponse.json({ error: "files array is required" }, { status: 400 })
    }
    
    const result = await attachFilesToJob(job_id, files)
    
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: result.data
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
