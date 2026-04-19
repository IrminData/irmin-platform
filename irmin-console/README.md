<img src="https://github.com/IrminData/.github/blob/development/irmin-logo-light.svg" width="200">

# Irmin Console

This repository contains the code for Irmin Console frontend, built using Next.js, TypeScript and Tailwind.

[Internal documentation](https://internal-docs.irmin.co/internal/products/console)

### Prerequisites

Ensure you have the following installed:

- Node.js (24.x)
- pnpm (10.24.0+). See [pnpm Installation Guide](https://pnpm.io/installation) for installation details.

## Environment Configuration (.env)

Copy the template and fill in the values you need:

```bash
cp .env.example .env
```

[`.env.example`](.env.example) is the single source of truth for every variable the app reads, with defaults, descriptions, and inline `[build-time, client]` / `[runtime, server]` tags.

### `NEXT_PUBLIC_` prefix

Any variable prefixed with `NEXT_PUBLIC_` is exposed to the browser by Next.js and **inlined into the JS bundle at build time**. Two consequences:

- **Never put secrets behind the `NEXT_PUBLIC_` prefix** — they ship to every visitor's browser.
- **Changing a `NEXT_PUBLIC_` var requires a rebuild.** Editing `.env` and restarting the server is not enough — the old value is baked into the last build output.

### Build-time vs runtime

- **Build-time (inlined at `pnpm build`)** — every `NEXT_PUBLIC_*` var, plus the Sentry source-map-upload trio (`SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_URL`). Change any of these and you must rebuild.
- **Runtime (server-side only)** — `NODE_ENV`, `CLERK_SECRET_KEY`, `NOVU_SECRET_KEY`, `REQUIRE_ENV_AUTH`, `ENV_PASSWORD`, `HMAC_SECRET`, and the Sentry server sampling vars. These are read on each request (or on server startup) and can be changed without a rebuild.

### Accessing env vars in code

Don't read `process.env.*` directly. All vars are Zod-validated at startup and exposed through two loaders in [`src/config/`](src/config):

- `clientEnv` from `env.client.ts` — `NEXT_PUBLIC_*` vars, importable anywhere.
- `env` from `env.server.ts` — `clientEnv` plus server-only secrets; guarded by `server-only` so client imports fail the build.

```ts
// client or shared code
import { clientEnv } from '@/config/env.client';
// server-only
import { env } from '@/config/env.server';
```

Adding a new var: update `.env.example`, the Zod schema, and (for client vars) the literal `raw` object in `env.client.ts`.

### Sentry

Sentry is disabled by default in dev so local errors don't reach the
shared project. Flip `NEXT_PUBLIC_SENTRY_ENABLED=true` and set
`NEXT_PUBLIC_SENTRY_DSN` to test reporting end-to-end.

Source map upload happens only when `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`,
and `SENTRY_PROJECT` are all set — typically in CI / prod builds. If
any is missing the build succeeds with no upload attempted. Set
`SENTRY_URL` to point at a self-hosted / EU / private-cloud Sentry.

Relevant env vars (see `.env.example` for full list):

- `NEXT_PUBLIC_SENTRY_ENABLED` — runtime toggle (default `false`)
- `NEXT_PUBLIC_SENTRY_DSN` — DSN (read by client, server, and edge)
- `SENTRY_ENVIRONMENT` — `development` / `staging` / `production`
- `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_URL`, `SENTRY_AUTH_TOKEN` — source map upload (build-time only)
- `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE`, `NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE`, `NEXT_PUBLIC_SENTRY_REPLAYS_ERROR_SAMPLE_RATE` — browser sampling
- `SENTRY_TRACES_SAMPLE_RATE`, `SENTRY_PROFILE_SESSION_SAMPLE_RATE` — server/edge sampling (continuous profiling)

## Running the Project

**Validate code**

```
# Compiles TypeScript, lints, and formats code, with auto-fixing of linting and formatting errors
pnpm validate
```

**Other commands**

```
# Checks for TypeScript errors
pnpm typecheck

# Lints code, checking for linting and formatting errors
pnpm lint

# Lints code, with auto-fixing of linting and formatting errors
pnpm lint:fix

# Checks the code formatting
pnpm format

# Auto-fixes the code formatting
pnpm format:fix
```

**Running the server**

```
# Runs the development server with HTTPS using Turbopack (default)
pnpm dev

# Same as above, but without HTTPS (not recommended)
pnpm dev:no-https

# Builds the project and automatically runs the TypeDoc documentation
pnpm build

# Starts the server
pnpm start
```

**With Docker**

```
docker build -t irmin-console .
docker run -p 3000:3000 irmin-console
```

**Creating Docker image**

```
docker buildx create --use # Verify Buildx is active: docker buildx ls
docker buildx build --platform linux/amd64/v2,linux/arm64/v8 -t YOUR_DOCKER_USERNAME/irmin-console:latest --push .
```

## TypeDoc documentation

TypeDoc is used to document the codebase. TypeDoc is a standard for documenting TypeScript code. It is similar to JSDoc but is specifically designed for TypeScript.

When documenting code, use TypeDoc comments. TypeDoc comments should be placed above the function or type they are documenting. The comments should include a description of the function or type, the parameters, and the return value.

To generate the TypeDoc documentation, run:

```
pnpm docs
```

Please make sure to document all functions and types you create, especially if they are exported. This will help other developers understand the codebase and use the functions you have created. Make sure that the `pnpm docs` command runs without errors or warnings before creating a pull request.

The documentation will be generated in the `public/frontend-docs` directory. The middleware is setup to serve the documentation at `/tsdocs` and to require dev password to access it, see [middleware.ts](src/middleware.ts) for more information.

See [TypeDoc website](https://typedoc.org/) for more information on TypeDoc.

## Testing

Playwright is used for end-to-end testing. The tests are located in the `tests` directory.

To run the tests, use the following commands:

```
pnpm e2e # Run the tests
pnpm e2e:ui # Run the tests with UI
pnpm e2e:report # Show the test report
```

To generate test code, use the following commands:

```
pnpm e2e:codegen # Generate test code for desktop
pnpm e2e:codegen-mobile # Generate test code for mobile
```

## License

This project is licensed under the [Elastic License 2.0 (ELv2)](LICENSE).
