/** @type {import('next').NextConfig} */
const { withSentryConfig } = require('@sentry/nextjs');
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
      // Permitir qualquer hostname para avatares (produção)
      {
        protocol: 'http',
        hostname: '**',
        pathname: '/api/files/**',
      },
      {
        protocol: 'https',
        hostname: '**',
        pathname: '/api/files/**',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || '',
  },
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

const sentryWebpackPluginOptions = {
  silent: true, // Não exibir logs do Sentry durante build
  hideSourceMaps: true, // Não expor sourcemaps em produção
  disableLogger: true,
};

// Sentry só ativo se DSN configurado
const withSentry = process.env.NEXT_PUBLIC_SENTRY_DSN
  ? (config) => withSentryConfig(config, sentryWebpackPluginOptions)
  : (config) => config;

module.exports = withSentry(withPWA(nextConfig));
