import type { NextConfig } from 'next';

import { SentryBuildOptions, withSentryConfig } from '@sentry/nextjs';

/**
 * Next.js configuration
 */
const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  turbopack: {
    resolveExtensions: ['.mdx', '.tsx', '.ts', '.jsx', '.js', '.mjs', '.json'],
  },
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: '**.irmin.dev',
      },
      {
        protocol: 'https',
        hostname: '**.irmin.co',
      },
      {
        protocol: 'https',
        hostname: '**.irmin.app',
      },
      {
        protocol: 'https',
        hostname: '**.railway.app',
      },
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
      },
    ],
  },
};

// Source-map upload requires all three of: auth token, org, project. If any
// is missing we disable upload entirely so builds succeed cleanly without
// trying (and failing) to upload. Correct posture for forks, self-hosted
// deploys, and local `pnpm build`.
const canUploadSourceMaps = Boolean(
  process.env.SENTRY_AUTH_TOKEN &&
  process.env.SENTRY_ORG &&
  process.env.SENTRY_PROJECT
);

const sentryConfig: SentryBuildOptions = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  sentryUrl: process.env.SENTRY_URL || 'https://sentry.io/',

  silent: !process.env.CI,
  telemetry: false,

  widenClientFileUpload: true,

  reactComponentAnnotation: {
    enabled: true,
  },

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  tunnelRoute: '/monitoring',

  disableLogger: true,

  automaticVercelMonitors: true,

  sourcemaps: {
    // Missing any of token/org/project → skip generation entirely. Build
    // stays lean, no warnings about missing auth, no failed upload.
    disable: !canUploadSourceMaps,
    // When we do upload, delete the .map files from the build output so
    // they aren't served publicly.
    deleteSourcemapsAfterUpload: true,
  },
};

export default withSentryConfig(nextConfig, sentryConfig);
