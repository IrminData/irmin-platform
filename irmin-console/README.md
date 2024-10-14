<img src="https://github.com/IrminData/.github/blob/development/irmin-logo-light.svg" width="200">

# Irmin frontend (irmin-frontend)

This repository contains the code for Irmin frontend, built using Next.js, TypeScript and Tailwind.

[Internal documentation](https://internal-docs.irmin.co/internal/products/console)

### Prerequisites

Ensure you have the following installed:

- Node.js (20.x)
- Yarn (4.5.0). See [Yarn v2 Migration Guide](#yarn-v2-migration-guide) for migration details.

## Environment Configuration (.env)

Create a `.env` file in the project root. Add the following environment variables:

```text
# Basic settings
NEXT_PUBLIC_BASE_URL=https://irmin.dev  # Base URL of the application
NEXT_PUBLIC_ENVIRONMENT_TYPE=development  # Environment type. Can be development, staging or production.

# API and CMS URLs
NEXT_PUBLIC_API_URL=https://api.irmin.dev  # API endpoint URL
NEXT_PUBLIC_WORDPRESS_URL=https://cms.irmin.dev  # WordPress CMS URL

# Authentication
NEXT_PUBLIC_TOKEN_MAX_AGE=1800 # 30 minutes, how long are the token and profile data valid, before they are refetched

# Environment authentication requirements (eg. password protection for staging)
REQUIRE_ENV_AUTH=true  # Enable environment-specific authentication
ENV_PASSWORD=devpassword  # Password for environment authentication

# Offline mode
NEXT_PUBLIC_OFFLINE_MODE=false  # Toggle offline mode for the Irmin API
NEXT_PUBLIC_AUTH_OFFLINE_MODE=false # Toggle offline mode for authentication eg. Clerk
NEXT_PUBLIC_CMS_OFFLINE_MODE=false  # Toggle offline mode for the Irmin CMS

# Sentry
SENTRY_AUTH_TOKEN=sntryu_xxxxx  # Sentry token for error tracking

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
CLERK_SECRET_KEY=YOUR_SECRET_KEY

# Environmant variables for testing

TEST_USER_EMAIL=example@example.com # Irmin user email to run tests with
TEST_USER_PASSWORD=12345678 # Irmin user password to run tests with
TEST_USER_WORKSPACE="Example Core" # Workspace available for the test user
TEST_USER_WORKSPACE_SLUG="example-core" # Slug of the workspace available for the test user
TEST_USER_REPOSITORY="KPIs and Performance Metrics" # Repository available for the test user
TEST_USER_REPOSITORY_SLUG="kpi-and-performance-metrics" # Slug of the repository available for the test user

```

## Running the Project

Lint and code formatting:

```bash
yarn lint

yarn format
# or
yarn format:fix
```

Start the server:

```bash
yarn dev-ssl
# or
yarn dev
```

Build and start the server:

```bash
yarn build
yarn start
```

With Docker:

```bash
docker build -t irmin-frontend .
docker run -p 3000:3000 irmin-frontend
```

## Yarn v2 Migration Guide

If you are migrating from Yarn v1 to Yarn v2, please follow the official migration guide provided by Yarn: [Yarn v2 Migration Guide](https://yarnpkg.com/migration/guide).

To quickly migrate, you can use the following commands:

1. Set Yarn to use version 2:

   ```bash
   yarn set version 4.4.1
   ```

2. Create or update the `.yarnrc.yml` file in your project root:

   ```yaml
   nodeLinker: node-modules
   yarnPath: .yarn/releases/yarn-4.4.1.cjs
   ```

3. Install dependencies using Yarn v2:
   ```bash
   yarn install
   ```

Refer to the migration guide for more detailed steps and troubleshooting tips.

## TypeDoc documentation

TypeDoc is used to document the codebase. TypeDoc is a standard for documenting TypeScript code. It is similar to JSDoc but is specifically designed for TypeScript.

When documenting code, use TypeDoc comments. TypeDoc comments should be placed above the function or type they are documenting. The comments should include a description of the function or type, the parameters, and the return value.

To generate the TypeDoc documentation, run:

```bash
yarn docs
```

Please make sure to document all functions and types you create, especially if they are exported. This will help other developers understand the codebase and use the functions you have created. Make sure that the `yarn docs` command runs without errors or warnings before creating a pull request.

The documentation will be generated in the `public/frontend-docs` directory. The middleware is setup to serve the documentation at `/tsdocs` and to require dev password to access it, see [middleware.ts](src/middleware.ts) for more information.

See [TypeDoc website](https://typedoc.org/) for more information on TypeDoc.

## Testing

Playwright is used for end-to-end testing. The tests are located in the `tests` directory.

To run the tests, use the following commands:

```bash
yarn e2e # Run the tests
yarn e2e:ui # Run the tests with UI
yarn e2e:report # Show the test report
```

To generate test code, use the following commands:

```bash
yarn e2e:codegen # Generate test code for desktop
yarn e2e:codegen-mobile # Generate test code for mobile
```
