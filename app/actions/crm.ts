"use server"

// Fires Boss Wayne's GoHighLevel "Inbound Webhook" trigger with a new
// customer's signup info. Best-effort: a CRM hiccup should never block
// account creation, so failures are logged and swallowed rather than thrown.
export async function sendNewCustomerToCRM(data: {
  fullName: string
  email: string
  phone: string
}) {
  const webhookUrl = process.env.GHL_WEBHOOK_URL
  if (!webhookUrl) {
    console.log("[crm] GHL_WEBHOOK_URL not set, skipping CRM hand-off")
    return
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: data.fullName,
        email: data.email,
        phone: data.phone,
      }),
    })
    if (!res.ok) {
      console.error("[crm] GHL webhook responded with", res.status, await res.text())
    }
  } catch (error) {
    console.error("[crm] Failed to reach GHL webhook:", error)
  }
}
