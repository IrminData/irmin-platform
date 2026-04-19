import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts', 'src/instrument.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  minify: false,
  external: [
    'better-sqlite3',
    'fastify',
    '@fastify/cors',
    '@huggingface/inference',
    '@langchain/core',
    'zod',
    'dotenv',
    // Ships native .node addons via @sentry-internal/node-cpu-profiler — must
    // stay external so esbuild doesn't try to bundle the binary.
    '@sentry/profiling-node',
    '@sentry-internal/node-cpu-profiler',
  ],
  esbuildOptions(options) {
    options.alias = {
      '@': './src',
    };
  },
});
