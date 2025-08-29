import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
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
  ],
  esbuildOptions(options) {
    options.alias = {
      '@': './src',
    };
  },
});
