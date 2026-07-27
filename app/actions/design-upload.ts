"use server"

import { createAdminClient, createClient } from "@/lib/supabase/server"

const BUCKET = "design-uploads"

// Uses the admin (service role) client to write into the private
// "design-uploads" bucket — sidesteps needing storage.objects RLS policies
// set up in the Supabase dashboard first. Uploads are allowed for anonymous
// visitors too, since shoppers configure and attach artwork on the product
// page *before* they're prompted to log in at Add to Cart / Buy Now. Files
// land in a private bucket and are only reachable via signed URLs, so there's
// no arbitrary-public-write exposure. Logged-in users get their files grouped
// under their user id; everyone else lands under an "anonymous" prefix.
export async function uploadDesignFile(formData: FormData) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()

  const file = formData.get("file") as File | null
  if (!file) {
    return { success: false, error: "No file provided" }
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
  const prefix = userData.user?.id ?? "anonymous"
  const path = `${prefix}/${Date.now()}-${safeName}`

  const admin = createAdminClient()
  const { error } = await admin.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  })
  if (error) {
    return { success: false, error: error.message }
  }

  // Bucket is private — a signed URL (long-lived, since print orders can sit
  // for days before production) is needed for the cart/checkout/admin UI to
  // actually display or re-download the file later.
  const { data: signed, error: signError } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 365)
  if (signError) {
    return { success: false, error: signError.message }
  }

  return {
    success: true,
    path,
    fileName: file.name,
    url: signed.signedUrl,
    contentType: file.type || "application/octet-stream",
  }
}
