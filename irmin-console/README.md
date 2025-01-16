<img src="https://github.com/IrminData/.github/blob/development/irmin-logo-light.svg" width="200">

# Irmin Console (irmin-frontend)

This repository contains the code for Irmin Console frontend, built using Next.js, TypeScript and Tailwind.

[Internal documentation](https://internal-docs.irmin.co/internal/products/console)

### Prerequisites

Ensure you have the following installed:

- Node.js (22.x)
- Yarn (4.5.1). See [Yarn v2 Migration Guide](#yarn-v2-migration-guide) for migration details.

## Environment Configuration (.env)

Create a `.env` file in the project root. Add the following environment variables:

```text
# Basic settings
NEXT_PUBLIC_BASE_URL=https://console.irmin.dev  # Base URL of the console
NEXT_PUBLIC_WEBSITE_URL=https://irmin.dev  # Website URL
NODE_ENV=development  # Environment type. Can be development, staging or production.
NEXT_PUBLIC_API_URL=https://api.irmin.dev  # API endpoint URL
IRMIN_SIGNED_URL_TOKEN=abcxyz  # Token for signed URL endpoints

# Environment authentication requirements (eg. password protection for staging)
REQUIRE_ENV_AUTH=true  # Enable environment-specific authentication
ENV_PASSWORD=devpassword  # Password for environment authentication

# Offline mode
NEXT_PUBLIC_OFFLINE_MODE=false  # Toggle offline mode for the Irmin API
NEXT_PUBLIC_AUTH_OFFLINE_MODE=false # Toggle offline mode for authentication eg. Clerk

# Sentry for error tracking
SENTRY_AUTH_TOKEN=sntryu_xxxxx  # Sentry token for error tracking
NEXT_PUBLIC_SENTRY_DSN=https://ingest.de.sentry.io/xxxxx  # Sentry DSN for error tracking
SENTRY_SUPPRESS_TURBOPACK_WARNING=1 # Suppress Turbopack warning in Sentry

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
yarn lint

yarn format
# or
yarn format:fix
```

Start the server:

```
yarn dev
```

Build and start the server:

```
yarn build
yarn start
```

With Docker:

```
docker build -t irmin-frontend .
docker run -p 3000:3000 irmin-frontend
```

Creating Docker image:

```
docker buildx create --use # Verify Buildx is active: docker buildx ls
docker buildx build --platform linux/amd64/v2,linux/arm64/v8 -t YOUR_DOCKER_USERNAME/irmin-frontend:latest --push .
```

## TypeDoc documentation

TypeDoc is used to document the codebase. TypeDoc is a standard for documenting TypeScript code. It is similar to JSDoc but is specifically designed for TypeScript.

When documenting code, use TypeDoc comments. TypeDoc comments should be placed above the function or type they are documenting. The comments should include a description of the function or type, the parameters, and the return value.

To generate the TypeDoc documentation, run:

```
yarn docs
```

Please make sure to document all functions and types you create, especially if they are exported. This will help other developers understand the codebase and use the functions you have created. Make sure that the `yarn docs` command runs without errors or warnings before creating a pull request.

The documentation will be generated in the `public/frontend-docs` directory. The middleware is setup to serve the documentation at `/tsdocs` and to require dev password to access it, see [middleware.ts](src/middleware.ts) for more information.

See [TypeDoc website](https://typedoc.org/) for more information on TypeDoc.

## Testing

Playwright is used for end-to-end testing. The tests are located in the `tests` directory.

To run the tests, use the following commands:

```
yarn e2e # Run the tests
yarn e2e:ui # Run the tests with UI
yarn e2e:report # Show the test report
```

To generate test code, use the following commands:

```
yarn e2e:codegen # Generate test code for desktop
yarn e2e:codegen-mobile # Generate test code for mobile
```
