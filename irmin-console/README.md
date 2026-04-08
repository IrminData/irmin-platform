<img src="https://github.com/IrminData/.github/blob/development/irmin-logo-light.svg" width="200">

# Irmin Console

This repository contains the code for Irmin Console frontend, built using Next.js, TypeScript and Tailwind.

[Internal documentation](https://internal-docs.irmin.co/internal/products/console)

### Prerequisites

Ensure you have the following installed:

- Node.js (24.x)
- pnpm (10.24.0+). See [pnpm Installation Guide](https://pnpm.io/installation) for installation details.

## Environment Configuration (.env)

See [.env.example](.env.example) for required and optional variables.

To set environment variables, copy the `.env.example` file and update the variables as required.

```bash
cp .env.example .env
# Add your API keys and update other variables as required:
# API_SYSTEM_TOKEN=your_irmin_system_token
# CLERK_SECRET_KEY=your_clerk_secret_key
# NEXT_PUBLIC_API_DOCS_URL=https://docs.irmin.co
```

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
