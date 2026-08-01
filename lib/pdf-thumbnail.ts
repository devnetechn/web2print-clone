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
  const path = await import("path")
  const require = createRequire(import.meta.url)
  pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(
    require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs"),
  ).toString()

  // Same underlying problem as the worker file: pdf.js falls back to
  // fetching several kinds of bundled data — standard (non-embedded) fonts,
  // CMaps, ICC color profiles, and wasm codecs (JBIG2/OpenJPEG) — from the
  // filesystem relative to its own package directory, which breaks once
  // deployed. Resolve pdfjs-dist's own package.json to find its real
  // on-disk root, then point every one of these at the folder that ships
  // inside it directly, so none of them fall through to that broken path.
  const pkgDir = path.dirname(require.resolve("pdfjs-dist/package.json"))
  const dirUrl = (name: string) => pathToFileURL(path.join(pkgDir, name) + path.sep).toString()

  const loadingTask = pdfjsLib.getDocument({
    data: bytes,
    disableFontFace: true,
    useSystemFonts: true,
    standardFontDataUrl: dirUrl("standard_fonts"),
    cMapUrl: dirUrl("cmaps"),
    cMapPacked: true,
    iccUrl: dirUrl("iccs"),
    wasmUrl: dirUrl("wasm"),
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
