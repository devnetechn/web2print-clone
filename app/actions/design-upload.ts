"use server"

import { createAdminClient, createClient } from "@/lib/supabase/server"
import { renderPdfThumbnail } from "@/lib/pdf-thumbnail"

const BUCKET = "design-uploads"

async function ensureBucketExists() {
  const admin = createAdminClient()
  try {
    await admin.storage.getBucket(BUCKET)
  } catch {
    try {
      await admin.storage.createBucket(BUCKET, { public: false })
      console.log(`[design-upload] Created missing bucket: ${BUCKET}`)
    } catch (createError) {
      console.error(`[design-upload] Failed to create bucket:`, createError)
      throw new Error(`Storage bucket initialization failed. Contact support.`)
    }
  }
}

// Returns a short-lived signed URL the browser uploads directly to.
// Vercel's serverless functions cap request bodies around 4.5MB — well
// under what print-ready artwork (PDF/AI/EPS/TIFF) commonly runs — so the
// file bytes have to go straight from the browser to Supabase Storage
// instead of through a Server Action. Still requires a logged-in session
// (checked here) so an anonymous caller can't mint an upload URL.
export async function createDesignUploadUrl(fileName: string) {
  try {
    await ensureBucketExists()
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Storage not available" }
  }

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { success: false, error: "Not logged in" }
  }

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_")
  const path = `${userData.user.id}/${Date.now()}-${safeName}`

  const admin = createAdminClient()
  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path)
  if (error) {
    console.error(`[design-upload] createSignedUploadUrl failed:`, error)
    return { success: false, error: error.message }
  }

  return { success: true, path, token: data.token }
}

// Called once the browser's direct upload to the signed URL succeeds —
// hands back a long-lived signed read URL (bucket is private) for the
// cart/checkout/admin UI to display or re-download the file later.
export async function finalizeDesignUpload(path: string, fileName: string, contentType: string) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user || !path.startsWith(`${userData.user.id}/`)) {
    return { success: false, error: "Not logged in" }
  }

  const admin = createAdminClient()
  const { data: signed, error: signError } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 365)
  if (signError) {
    return { success: false, error: signError.message }
  }

  const thumbnailUrl = await tryGenerateThumbnail(admin, path, contentType)

  return {
    success: true,
    path,
    fileName,
    url: signed.signedUrl,
    contentType,
    thumbnailUrl,
  }
}

// Best-effort — a customer's uploaded file is still perfectly usable
// without a preview image, so any failure here (corrupt PDF, oversized
// file, render timeout) just falls back to the generic file-type icon
// instead of failing the whole upload.
async function tryGenerateThumbnail(
  admin: ReturnType<typeof createAdminClient>,
  path: string,
  contentType: string,
): Promise<string | undefined> {
  if (contentType !== "application/pdf") return undefined

  try {
    const { data: fileBlob, error: downloadError } = await admin.storage.from(BUCKET).download(path)
    if (downloadError || !fileBlob) return undefined

    const bytes = new Uint8Array(await fileBlob.arrayBuffer())
    const thumbBuffer = await renderPdfThumbnail(bytes)

    const thumbPath = `${path}.thumb.png`
    const { error: uploadError } = await admin.storage.from(BUCKET).upload(thumbPath, thumbBuffer, {
      contentType: "image/png",
      upsert: true,
    })
    if (uploadError) return undefined

    const { data: signedThumb } = await admin.storage.from(BUCKET).createSignedUrl(thumbPath, 60 * 60 * 24 * 365)
    return signedThumb?.signedUrl
  } catch (error) {
    console.error(`[design-upload] Thumbnail generation failed for ${path}:`, error)
    return undefined
  }
}
