# Irmin Frontend

Welcome to the Irmin Frontend repository! This repository contains the code for the frontend application of Irmin, built using Next.js and TypeScript. To function correctly, this project requires the [Irmin API](https://github.com/IrminData/irmin-api) to be running.

## Table of Contents

- [Getting Started](#getting-started)
- [Environment Configuration](#environment-configuration)
- [Running the Project](#running-the-project)
- [Branch Naming Rules](#branch-naming-rules)
- [GitHub Actions](#github-actions)
- [Yarn v2 Migration Guide](#yarn-v2-migration-guide)
- [Additional Information](#additional-information)

## Getting Started

### Prerequisites

Before you start, ensure you have the following installed on your machine:

- Node.js (v20.x or later)
- Yarn (v2.x or later)

### Cloning the Repository

Clone the repository to your local machine:

```bash
git clone https://github.com/IrminData/irmin-frontend.git
cd irmin-frontend
```

### Installing Dependencies

Install the necessary dependencies using Yarn:

```bash
yarn install
```

## Environment Configuration

To configure the environment variables for the project, create a `.env` file in the root directory of the project. Refer to the [environment.md](environment.md) file for detailed information on the required environment variables and their purposes.

Example `.env` file:

```dotenv
NEXT_PUBLIC_BASE_URL=https://irmin.dev
REQUIRE_ENV_AUTH=true
ENV_PASSWORD=devpassword
NEXT_PUBLIC_API_URL=https://api.irmin.dev
NEXT_PUBLIC_OFFLINE_MODE=false
```

## Running the Project

### Development

To start the development server, run:

```bash
yarn dev
```

For development with HTTPS:

```bash
yarn dev-ssl
```

### Production

To build the project for production, run:

```bash
yarn build
```

To start the production server, run:

```bash
yarn start
```

### Linting and Formatting

To lint the codebase, run:

```bash
yarn lint
```

To check the formatting of the codebase, run:

```bash
yarn format
```

To fix formatting issues, run:

```bash
yarn format:fix
```

## TypeScript

The project is written in TypeScript. When developing, try to always define types and avoid using `any`. This ensures better type safety and code quality.

## Next.js App Router

We use Next.js with the App Router. For more information, see the [Next.js documentation](https://nextjs.org/docs/app).

## Backend

The backend is a Laravel application. API documentation can be found in Postman. Please refer to the Postman documentation for detailed API information.

## Branch Naming Rules

When creating a new branch, please adhere to the following naming conventions:

- For new features: `person-feat-(featurename)`
  - Example: `alice-feat-user-authentication`
- For bug fixes: `person-fix-(bugfix)`
  - Example: `bob-fix-login-error`

**Important**: Never push to `development` directly or especially to `production`! Always create a pull request for any changes you want to merge.

## GitHub Actions

When a Pull Request (PR) is opened, the following GitHub Actions are automatically run:

1. **Code Formatting**: Checks if the code is properly formatted using Prettier.
2. **Linting**: Runs ESLint to ensure code quality.
3. **Build**: Attempts to build the application to catch any build-time errors.

Please ensure your code passes all these checks before requesting a review.

## Yarn v2 Migration Guide

If you are migrating from Yarn v1 to Yarn v2, please follow the official migration guide provided by Yarn: [Yarn v2 Migration Guide](https://yarnpkg.com/migration/guide).

To quickly migrate, you can use the following commands:

1. Set Yarn to use version 2:

   ```bash
   yarn set version berry
   ```

2. Create or update the `.yarnrc.yml` file in your project root:

   ```yaml
   yarnPath: .yarn/releases/yarn-berry.cjs
   nodeLinker: pnp
   ```

3. Install dependencies using Yarn v2:
   ```bash
   yarn install
   ```

Refer to the migration guide for more detailed steps and troubleshooting tips.

## Additional Information

The development environment can be found at:

- Frontend: [https://irmin.dev](https://irmin.dev)
- Backend: [https://api.irmin.dev](https://api.irmin.dev)

Both are hosted on DigitalOcean.

If you have any questions or need further assistance, please contact:

- Haz: haz@irmin.co
- Tim: tim@irmin.co

Thank you for contributing to the Irmin Frontend project!
