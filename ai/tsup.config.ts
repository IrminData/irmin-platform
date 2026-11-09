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
    // Ships native .node addons via @sentry/node-cpu-profiler — must stay
    // external so esbuild doesn't try to bundle the binary. Keep the former
    // @sentry-internal package name in case a transitive import still uses it.
    '@sentry/profiling-node',
    '@sentry/node-cpu-profiler',
    '@sentry-internal/node-cpu-profiler',
  ],
  esbuildOptions(options) {
    options.alias = {
      '@': './src',
    };
  },
});
