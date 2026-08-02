#!/usr/bin/env node
// Uploads sourcemaps to Sentry. No-ops cleanly when the required env vars
// are missing, so local and CI builds without Sentry credentials don't fail.
import { spawnSync } from 'node:child_process';

const { SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT, SENTRY_URL } =
  process.env;

if (!SENTRY_AUTH_TOKEN || !SENTRY_ORG || !SENTRY_PROJECT) {
  console.log(
    '[sentry] skipping sourcemap upload: SENTRY_AUTH_TOKEN / SENTRY_ORG / SENTRY_PROJECT not all set'
  );
  process.exit(0);
}

const baseArgs = ['--org', SENTRY_ORG, '--project', SENTRY_PROJECT];
if (SENTRY_URL) {
  baseArgs.unshift('--url', SENTRY_URL);
}

const steps = [
  ['sourcemaps', 'inject', ...baseArgs, './dist'],
  ['sourcemaps', 'upload', ...baseArgs, './dist'],
];

for (const args of steps) {
  const result = spawnSync('sentry-cli', args, { stdio: 'inherit' });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
