import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Next.js configuration
 */
const nextConfig = {
  sassOptions: {
    includePaths: [path.join(__dirname, 'src', 'styles')],
    silenceDeprecations: ['legacy-js-api'],
  },
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
