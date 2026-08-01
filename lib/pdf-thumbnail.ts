const TARGET_WIDTH = 400

// Renders page 1 of a PDF to a PNG buffer, for showing customers a visual
// preview of their uploaded artwork instead of just a filename — pdf.js's
// Node build plus @napi-rs/canvas both run fine in a Vercel serverless
// function without needing system libraries (Cairo, Ghostscript, etc.).
//
// Both are imported dynamically (not at module top-level) because
// @napi-rs/canvas loads a platform-specific native binary as a side effect
// of being imported — if that binary is missing or fails to load for any
// reason, a top-level import throws at module-evaluation time, which would
// take down every caller of this file, not just thumbnail generation.
// Dynamic import keeps that failure inside the caller's own try/catch, so
// a broken canvas binary just means no thumbnail, not a broken upload.
export async function renderPdfThumbnail(bytes: Uint8Array): Promise<Buffer> {
  const { createCanvas } = await import("@napi-rs/canvas")
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs")

  const loadingTask = pdfjsLib.getDocument({
    data: bytes,
    disableFontFace: true,
    useSystemFonts: true,
  })
  const doc = await loadingTask.promise
  try {
    const page = await doc.getPage(1)
    const unscaled = page.getViewport({ scale: 1 })
    const viewport = page.getViewport({ scale: TARGET_WIDTH / unscaled.width })

    const canvas = createCanvas(viewport.width, viewport.height)
    const ctx = canvas.getContext("2d")
    // @ts-expect-error - @napi-rs/canvas's 2D context is API-compatible with
    // what pdf.js expects but isn't the DOM CanvasRenderingContext2D type.
    await page.render({ canvasContext: ctx, viewport, canvas }).promise

    return canvas.toBuffer("image/png")
  } finally {
    await loadingTask.destroy()
  }
}
