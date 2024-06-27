/** @type {import('next').NextConfig} */
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
        hostname: '**.postgresql.org',
        port: '',
      },
    ],
  },
};

export default nextConfig;
