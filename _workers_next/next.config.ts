import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Cache Components are unreliable on Workers (dummy cache + setTimeout warnings)
  cacheComponents: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
    formats: ['image/avif', 'image/webp'],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  async rewrites() {
    return [
      {
        source: '/authcallback',
        destination: '/api/auth/callback/linuxdo',
      },
      {
        source: '/favicon.ico',
        destination: '/favicon',
      },
    ]
  },
};

export default nextConfig;
