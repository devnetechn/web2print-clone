/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  // Bundlers relocate a package's files into their own chunk output, which
  // breaks native addons like @napi-rs/canvas that require() a .node binary
  // relative to their own package directory. Marking them external leaves
  // them as plain requires resolved from node_modules at runtime instead.
  serverExternalPackages: ["@napi-rs/canvas", "pdfjs-dist"],
  // Vercel's build determines which files to ship with each serverless
  // function via static analysis of require()/import calls. Both of these
  // load a sibling file through a dynamic path lookup that analysis can't
  // follow — @napi-rs/canvas its platform .node binary, pdfjs-dist its
  // pdf.worker.mjs (needed even in Node, to set up its "fake worker") —
  // so without this they silently aren't deployed and thumbnail rendering
  // fails in production even though it works locally.
  outputFileTracingIncludes: {
    "/**/*": [
      "./node_modules/@napi-rs/canvas-linux-x64-gnu/**/*",
      // The whole package, not just legacy/build — pdf.js also loads
      // standard_fonts/, cmaps/, iccs/, and wasm/ from sibling folders at
      // runtime, all invisible to static analysis the same way the worker
      // file is. Including the lot avoids finding the next one the hard way.
      "./node_modules/pdfjs-dist/**/*",
    ],
  },
  experimental: {
    // Default is 1MB — print-ready artwork (PDF/AI/EPS/TIFF) routinely
    // exceeds that, so uploadDesignFile's Server Action was rejecting
    // any real design file outright.
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
}

export default nextConfig