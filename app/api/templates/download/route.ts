import { type NextRequest, NextResponse } from "next/server"
import { head, put } from "@vercel/blob"

export const runtime = "nodejs"
export const maxDuration = 60

const SOURCE_PREFIX = "https://4over.com/media/asset/"
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"

// Mirrors a 4over template file into our own Blob store on first request,
// then serves it from Blob forever after. After the first download the site
// no longer depends on 4over's URLs.
export async function GET(request: NextRequest) {
  const src = request.nextUrl.searchParams.get("src")

  if (!src || !src.startsWith(SOURCE_PREFIX)) {
    return NextResponse.json({ error: "Invalid source" }, { status: 400 })
  }

  // Stable pathname inside our Blob store, mirroring the source path.
  const relative = src.slice(SOURCE_PREFIX.length)
  const blobPath = `templates/${relative}`
  const filename =
    request.nextUrl.searchParams.get("filename") || relative.split("/").pop() || "template"

  try {
    // 1. Already mirrored? Serve from Blob.
    try {
      const existing = await head(blobPath)
      if (existing?.url) {
        return NextResponse.redirect(withDownload(existing.url, filename))
      }
    } catch {
      // head throws when the blob does not exist yet — fall through to mirror.
    }

    // 2. Fetch from 4over.
    const upstream = await fetch(src, { headers: { "User-Agent": UA } })
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: `Upstream fetch failed (${upstream.status})` },
        { status: 502 },
      )
    }
    const contentType =
      upstream.headers.get("content-type") ||
      (src.endsWith(".eps") ? "application/postscript" : "image/jpeg")
    const data = await upstream.arrayBuffer()

    // 3. Cache to Blob (public, immutable).
    const blob = await put(blobPath, Buffer.from(data), {
      access: "public",
      contentType,
      addRandomSuffix: false,
      cacheControlMaxAge: 60 * 60 * 24 * 365,
      allowOverwrite: true,
    })

    // 4. Serve from the permanent Blob URL.
    return NextResponse.redirect(withDownload(blob.url, filename))
  } catch (error) {
    console.error("[v0] template mirror error:", error)
    return NextResponse.json({ error: "Download failed" }, { status: 500 })
  }
}

// Append a download hint so browsers save the file rather than navigating.
function withDownload(url: string, filename: string): string {
  const u = new URL(url)
  u.searchParams.set("download", filename)
  return u.toString()
}
