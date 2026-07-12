/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Turbopack is enabled by default in Next.js 16. Allow WASM fallback when
  // native @next/swc bindings are unavailable (e.g., node:22-slim Docker images).
  turbopack: {},
}

export default nextConfig
