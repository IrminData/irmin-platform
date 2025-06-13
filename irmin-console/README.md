<img src="https://github.com/IrminData/.github/blob/development/irmin-logo-light.svg" width="200">

# Irmin Console

This repository contains the code for Irmin Console frontend, built using Next.js, TypeScript and Tailwind.

[Internal documentation](https://internal-docs.irmin.co/internal/products/console)

### Prerequisites

Ensure you have the following installed:

- Node.js (22.x)
- pnpm (10.12.1). See [pnpm Installation Guide](https://pnpm.io/installation) for installation details.

## Environment Configuration (.env)

Create a `.env` file in the project root. Add the following environment variables:

```text
# Basic settings
NEXT_PUBLIC_BASE_URL=https://console.irmin.dev  # Base URL of the console
NEXT_PUBLIC_WEBSITE_URL=https://irmin.dev  # Website URL
NODE_ENV=development  # Environment type. Can be development, staging or production.
NEXT_PUBLIC_REVALIDATE="60" # Revalidation time in seconds for ISR (Incremental Static Regeneration)
NEXT_PUBLIC_LOG_NETWORK_REQUESTS="true" # Enable logging of network requests

# Vercel
ENABLE_EXPERIMENTAL_COREPACK=1

# API settings
NEXT_PUBLIC_API_URL=https://api.irmin.dev/api  # API endpoint URL
API_SYSTEM_TOKEN=abcxyz  # System token for API requests

# Environment authentication requirements (eg. password protection for staging)
REQUIRE_ENV_AUTH=true  # Enable environment-specific authentication
ENV_PASSWORD=devpassword  # Password for environment authentication

# Sentry for error tracking
SENTRY_AUTH_TOKEN=sntryu_xxxxx  # Sentry token for error tracking
NEXT_PUBLIC_SENTRY_DSN=https://ingest.de.sentry.io/xxxxx  # Sentry DSN for error tracking
SENTRY_SUPPRESS_TURBOPACK_WARNING=1 # Suppress Turbopack warning in Sentry

# Posthog key for analytics
NEXT_PUBLIC_POSTHOG_KEY="phc_abc123" # Posthog project key
NEXT_PUBLIC_POSTHOG_HOST="https://eu.i.posthog.com" # Posthog host URL

# Clerk for authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
CLERK_SECRET_KEY=YOUR_SECRET_KEY

# Novu for notifications
NEXT_PUBLIC_NOVU_APP_ID=1234 # Novu app ID
NOVU_SECRET_KEY=abc123 # Novu secret key

# Environmant variables for e2e testing
TEST_USER_EMAIL=example@example.com # Irmin user email to run tests with
TEST_USER_PASSWORD=12345678 # Irmin user password to run tests with
TEST_USER_WORKSPACE="Example Core" # Workspace available for the test user
TEST_USER_WORKSPACE_SLUG="example-core" # Slug of the workspace available for the test user
TEST_USER_REPOSITORY="KPIs and Performance Metrics" # Repository available for the test user
TEST_USER_REPOSITORY_SLUG="kpi-and-performance-metrics" # Slug of the repository available for the test user

```

## Running the Project

Lint and code formatting:

```
pnpm lint

pnpm format
# or
pnpm format:fix
```

Start the server:

```
pnpm dev
```

Build and start the server:

```
pnpm build
pnpm start
```

With Docker:

```
docker build -t irmin-console .
docker run -p 3000:3000 irmin-console
```

Creating Docker image:

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
