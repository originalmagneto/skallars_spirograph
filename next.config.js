/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  },
  outputFileTracingRoot: __dirname,
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  generateEtags: true,
  experimental: {
    optimizeCss: true,
    scrollRestoration: true
  },
  async headers() {
    return [
      {
        source: '/script/:path*',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript'
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig
