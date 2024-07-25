/**
 * Next.js configuration
 */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.irmin.dev',
        port: '',
      },
      {
        protocol: 'https',
        hostname: '**.irmin.co',
        port: '',
      },
      {
        protocol: 'https',
        hostname: '**.irmin.app',
        port: '',
      },
      {
        protocol: 'https',
        hostname: '**.postgresql.org',
        port: '',
      },
    ],
  },
};

export default nextConfig;
