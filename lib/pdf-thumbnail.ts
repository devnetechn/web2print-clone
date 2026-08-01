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

  // Even in Node, pdf.js sets up a "fake worker" by dynamically importing
  // pdf.worker.mjs from wherever it thinks its own package lives — a path
  // that doesn't survive being deployed into a serverless function bundle.
  // Resolving it explicitly through Node's own module resolution (which
  // still works, since the file is a real sibling on disk) sidesteps that.
  // The resolved path must be converted to a file:// URL — a bare
  // filesystem path (especially a Windows one like "C:\...") isn't a
  // valid specifier for dynamic import().
  const { createRequire } = await import("module")
  const { pathToFileURL } = await import("url")
  pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(
    createRequire(import.meta.url).resolve("pdfjs-dist/legacy/build/pdf.worker.mjs"),
  ).toString()

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
