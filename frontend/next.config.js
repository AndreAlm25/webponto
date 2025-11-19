/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        pathname: '/api/files/**',
      },
      {
        protocol: 'http',
        hostname: 'minio',
      },
      {
        protocol: 'http',
        hostname: '192.168.18.44',
        port: '4000',
        pathname: '/api/files/**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000',
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://backend:4000/api/:path*',
      },
    ];
  },
};

module.exports = withPWA(nextConfig);
