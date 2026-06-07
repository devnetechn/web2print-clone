import crypto from "crypto"

// Diagnostic route: verifies the 4over signature scheme works against the
// live /printproducts/categories endpoint using FOUROVER_API_SECRET as the
// private key (SHA256 hash -> HMAC of the HTTP method).
export async function GET() {
  const publicKey = process.env.FOUROVER_PUBLIC_KEY
  const privateKey = process.env.FOUROVER_API_SECRET

  if (!publicKey || !privateKey) {
    return Response.json(
      {
        ok: false,
        error: "Missing env vars",
        hasPublicKey: Boolean(publicKey),
        hasPrivateKey: Boolean(privateKey),
      },
      { status: 500 },
    )
  }

  const hashedKey = crypto.createHash("sha256").update(privateKey).digest("hex")
  const signature = crypto.createHmac("sha256", hashedKey).update("GET").digest("hex")

  const url = `https://api.4over.com/printproducts/categories?apikey=${publicKey}&signature=${signature}`

  try {
    const res = await fetch(url)
    const text = await res.text()

    // Try to parse JSON for a cleaner response, fall back to raw text
    let body: unknown = text
    try {
      body = JSON.parse(text)
    } catch {
      // keep as text
    }

    return Response.json({
      ok: res.ok,
      status: res.status,
      // mask the apikey in the echoed URL so it isn't exposed
      url: url.replace(publicKey, "***"),
      body,
    })
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Request failed" },
      { status: 500 },
    )
  }
}
