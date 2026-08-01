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
  // function via static analysis of require()/import calls. @napi-rs/canvas
  // loads its platform binary through a dynamic path lookup that analysis
  // can't follow, so without this the .node file silently isn't deployed
  // and the (gracefully-caught) thumbnail render fails in production even
  // though it works locally.
  outputFileTracingIncludes: {
    "/**/*": ["./node_modules/@napi-rs/canvas-linux-x64-gnu/**/*"],
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