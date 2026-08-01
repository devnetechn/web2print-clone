/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
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