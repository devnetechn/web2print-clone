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