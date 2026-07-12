/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Turbopack requires native @next/swc bindings which aren't available in
  // all Docker environments (e.g., node:22-slim). Use webpack instead.
  webpack: (config, { dev }) => config,
}

export default nextConfig
