<img src="https://github.com/IrminData/irmin-frontend/blob/development/public/irmin-logo-light.svg" width="200">

# Irmin web application

This repository contains the code for Irmin frontend, built using Next.js, TypeScript and Tailwind. To function correctly, this project requires the [Irmin API](https://github.com/IrminData/irmin-api) to be running.

Useful links:

- [Irmin Structure](https://excalidraw.com/#json=ZV3vKpXoNWZPcHqx2Rrc6,9cjm0aKRo43MvHZRYJyS1Q)
- [Irmin Frontend Documentation](https://irmin.dev/tsdocs)
- [Irmin API Documentation](https://api.irmin.dev/docs)

For project management and tickets we use Basecamp. If you need access to Basecamp, please contact us.

For feature requests, bug reports, or any other issues, please create a new issue on Github. 
- [Irmin frontend issues](https://github.com/IrminData/irmin-frontend/issues)
- [Irmin API issues](https://github.com/IrminData/irmin-api/issues)

If you would like to contribute to the project, please follow the guidelines in this README.

## Table of Contents

- [Getting Started](#getting-started)
- [How to contribute?](#how-to-contribute)
- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Running the Project](#running-the-project)
  - [Development](#development)
  - [Production](#production)
  - [Linting and Formatting](#linting-and-formatting)
- [Next.js App Router](#nextjs-app-router)
- [Branch Naming Rules](#branch-naming-rules)
- [GitHub Actions](#github-actions)
- [TypeScript and Types](#typescript-and-types)
- [Static data](#static-data)
  - [Offline mode](#offline-mode)
- [Irmin API](#irmin-api)
- [API Services](#api-services)
- [Internationalisation](#internationalisation)
- [Contexts](#contexts)
  - [ProfileContext](#profilecontext)
  - [LocaleContext](#localecontext)
  - [PopupContext](#popupcontext)
  - [BucketContext](#bucketcontext)
  - [WorkspaceContext](#workspacecontext)
- [Wordpress CMS](#wordpress-cms)
- [Yarn v2 Migration Guide](#yarn-v2-migration-guide)
- [TypeDoc documentation](#typedoc)
- [Additional Information](#additional-information)

## Getting Started

Read the following resources to get familiar with the project:

- [Irmin Structure](https://excalidraw.com/#json=ZV3vKpXoNWZPcHqx2Rrc6,9cjm0aKRo43MvHZRYJyS1Q)
- [Irmin Frontend Documentation](https://irmin.dev/tsdocs)
- [Irmin API Documentation](https://api.irmin.dev/docs)

### How to contribute?

The most important is thing is don't forget to follow the branch naming rules and the guidelines in this README.

#### Internal Contributors (Irmin Team)

Contribute to the project by following these steps:

1. Create a new branch from `development`
2. Make your changes
3. Push your changes to the branch
4. Run the tests and try to build. Ensure they pass and the build is successful.
5. Create a pull request to `development`
6. Wait for a review from another team member
7. Merge the pull request after the review has been approved
8. Delete the branch after merging

#### External Contributors

To contribute to the project, follow these steps:

1. Fork the repository
2. Create a new branch
3. Make your changes
4. Push your changes to your fork
5. Run the tests and try to build. Ensure they pass and the build is successful.
6. Create a pull request
7. Wait for a review from our team member

### Prerequisites

Before you start, ensure you have the following installed on your machine:

- Node.js (v20.x or later)
- Yarn (v2.x or later), see [Yarn v2 Migration Guide](#yarn-v2-migration-guide) for migration from Yarn v1 to Yarn v2

## Environment Configuration

To configure the environment variables for the project, create a `.env` file in the root directory of the project. Refer to the [environment.md](environment.md) file for detailed information on the required environment variables and their purposes.

Example `.env` file:

```text
NEXT_PUBLIC_BASE_URL=https://irmin.dev
REQUIRE_ENV_AUTH=true
ENV_PASSWORD=devpassword
NEXT_PUBLIC_API_URL=https://api.irmin.dev
NEXT_PUBLIC_OFFLINE_MODE=false
NEXT_PUBLIC_WORDPRESS_URL=https://cms.irmin.dev
NEXT_PUBLIC_ENVIRONMENT_TYPE=development
```

## Running the Project

### Development

To start the development server, run:

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

## Next.js App Router

We use Next.js with the App Router. For more information, see the [Next.js documentation](https://nextjs.org/docs/app).

## Branch Naming Rules

When creating a new branch, please adhere to the following naming conventions:

- For new features: `person/feat-(featurename)`
  - Example: `alice/feat-user-authentication`
- For bug fixes: `person/fix-(bugfix)`
  - Example: `bob/fix-login-error`

**Important**: Never push to `development` directly or especially to `production`! Always create a pull request for any changes you want to merge.

## GitHub Actions

When a Pull Request (PR) is opened, the following GitHub Actions are automatically run:

1. **Code Formatting**: Checks if the code is properly formatted using Prettier.
2. **Linting**: Runs ESLint to ensure code quality.
3. **Build**: Attempts to build the application to catch any build-time errors.

Please ensure your code passes all these checks before requesting a review.

## TypeScript and Types

The project is written in TypeScript. When developing, try to always define types and avoid using `any`. Types should be named in PascalCase and should be descriptive of their purpose. This ensures better type safety and code quality.

Types can be found in the `types` directory. If you need to create a new type, add it to the `types` directory under the correct subdirectory and import it where needed.

`types/api` contains types for API responses. `types/website` contains types for website components and Wordpress API. `types/internal` contains types used by the portal internally.

Avoid creating types inside components. Instead, create them in the `types` directory and import them where needed. If you still decide to create a type inside a component, ensure it is only used within that component and not exported.

All types are stored in `src/types` directory. 

## Static data

API Services in some cases now refer to API resources which are not yet part of the API. When the `NEXT_PUBLIC_ENVIRONMENT_TYPE` is set to `development` we avoid crashing the application on API error. Instead we show the error in console and return the example object from the API Services.

Note! This is not meant for use in production or staging environments, but only locally or in development. Simply not to break the application when the API doesn't yet have some functionality or the API is for some reason broken.

### Offline mode

The offline mode can be enabled by setting the `NEXT_PUBLIC_OFFLINE_MODE` environment variable to `true`.

The offline mode exists to enable smooth development process in situations with bad or non existent internet connections, such as on a plane. 

When offline mode is enabled something is always returned for API requests in API Services. The offline mode returns objects from example objects eg. [src/lib/exampleObjects/apiObjects.ts](src/lib/exampleObjects/apiObjects.ts) depending on what would be the APIs expected return type.

Note! It is not meant for anything but local use.

## Irmin API

The backend is a Laravel application. API documentation can be found in Postman. Please refer to the Postman documentation for detailed API information.

The API documentation can be found here: [Irmin API docs](https://api.irmin.dev/docs)

## API Services

To call the API, we use API Services. These services contain the API endpoints and the logic for calling the API. The API Services are located in the `src/lib/api` directory. Each service corresponds to a specific resource in the API.

Please note that accessing a lot of things on the API requires user to be authenticated and the API call be made from the client. This is because the API relies on a cookie set on the API domain. This is why most API Services are not used on the server side, but only on the client side. 

Every API Service function for fetching the API should follow the same structure:

1) The function should be async and return a Promise.
2) The function should call the API using the fetchWithCredentials utility function.
3) The function should return the response itself, not the data from the response. The data should be extracted in the component that calls the service.
4) The function should be documented with TypeDoc/TypeDoc comments. The comments should include a description of the function, the parameters, and the return value. Also, if available add the link to the API documentation for that endpoint. If not available, add a TODO note that the API documentation is not available yet.
5) The function should be able to handle Offline Mode and Development Environments needs. This means returning static data when the API request fails or when Offline Mode is enabled.

Some services have been created before the API has been fully implemented. In these cases, when the environment is set to development, the services return example objects from the [apiObjects.ts](src/lib/exampleObjects/apiObjects.ts) file. See [Static data](#static-data) section of this README for more information

Examples:

[src/lib/api/BucketService.ts](src/lib/api/BucketService.ts) -> contains a list of endpoints for Buckets the frontend will be calling.
[src/lib/exampleObjects/apiObjects.ts](src/lib/exampleObjects/apiObjects.ts) -> contains example API objects of certain types. These objects are used in development when the API request fails or if Offline Mode is enabled
[src/types/api/Bucket.ts](src/types/api/Bucket.ts) -> contains types for Bucket resources, which the BucketService and ExampleObject refer to.

## Internationalisation

The website is available in multiple languages. 

The locale is set based on the URL path. For example, `/en` is English, `/fi` is Finnish, and so on. See route `src/app/[lang]`.

If the language is set in the URL, the website will be displayed in that language. If the language is not set in the URL, the website will try to get the users browser language. If the browser language is not supported, the default language will be used.

If user manually switches languages, the preferred language is stored in cookies and used in the future.

Languages, default language and available locales are defined in [src/dictionaries.ts](src/dictionaries.ts).

- [src/middleware.ts](src/middleware.ts) -> Middleware for setting the locale based on the URL path or browser language.
- [src/context/LocaleContext.tsx](src/context/LocaleContext.tsx) -> Context for managing the locale and translations state across the application.
- [src/dictionaries.ts](src/dictionaries.ts) -> Responsible for providing translation lists, setting the default language, and available locales.

Dictionaries are JSON objects which are used to translate the website content. They are used in the components to translate the content based on the locale. The key is the translation key and the value is the translation itself. `getDictionary()` function in `dictionaries.ts` is used to get the correct dictionary based on the locale.

Dictionaries can be found in the `src/dictionaries` folder.

For example see:
-  [English dictionary](src/dictionaries/en.ts) -> English translations
-  [Finnish dictionary](src/dictionaries/fi.ts) -> Finnish translations


## Contexts

Contexts are used to manage global state in the application. Contexts are located in the `src/context` directory. Each context corresponds to a specific piece of global state, ensuring that data is easily accessible throughout the application without the need for prop drilling.

Contexts are responsible for directly using the [API Services](#api-services) to fetch and manage data. This ensures a clear separation of concerns and promotes a more maintainable codebase.

When creating a new context, ensure it follows the same structure as the existing contexts.

### ProfileContext

[src/context/ProfileContext.tsx](src/context/ProfileContext.tsx)

ProfileContext is used to manage the user profile state across the application. It provides the user profile data and a function to refetch the user profile data. ProfileProvider is wrapping the root layout of the application. 

For example, the application will know that a user is not logged in if the user profile data is not available. [AuthService](src/lib/api/AuthService.ts) will avoid throwing an error on getProfile if the user is not logged in. Instead, it will return null.

This context provides the application with logic to communicate with the [Auth API Service](src/lib/api/AuthService.ts).

Please note that unlike with other contexts, the AuthService is a lot of times used directly in components. 

### LocaleContext

[src/context/LocaleContext.tsx](src/context/LocaleContext.tsx)

LocaleContext is used to manage the locale and translations state across the application. It provides the current locale, current dictionary, and a function to change the locale. LocaleProvider is wrapping the root layout of the application. 

See (Internationalisation)[#internationalisation] for more information.

### PopupContext

[src/context/PopupContext.tsx](src/context/PopupContext.tsx)

PopupContext is used to manage the popup state across the application. It provides functions to open and close different popups. PopupProvider is wrapping the [Portal Layout](src/app/[lang]/portal/layout.tsx) of the application, since it is only used in the portal.

The context is not using any API Services and exists mostly for convinience and to render the popups on top of other UIs.

The popup UIs can be found in the `src/components/misc` directory. 

### BucketContext

[src/context/BucketContext.tsx](src/context/BucketContext.tsx)

BucketContext is used to manage the bucket and file navigator state across the application. It provides the bucket data, file navigator data, and a lot of functions around them.

BucketProvider is wrapping the [Workspace Layout](src/app/[lang]/portal/[workspace]/layout.tsx) of the application, since it only relates to a specific workspace.

See [Bucket API Service](src/lib/api/BucketService.ts) and [the Editor](src/app/[lang]/portal/[workspace]/editor/layout.tsx) for more information.

### WorkspaceContext

[src/context/workspace/WorkspaceContext.tsx](src/context/workspace/WorkspaceContext.tsx)

Split into multiple files for clarity and to avoid a single file becoming too large. 

This context is responsible for managing the workspace state. This includes the workspace data, workflows, datasets, and other workspace-related data, which is not provided by other contexts.

It provides the application with logic to communicate with:

- [Workspace API Service](src/lib/api/WorkspaceService.ts)
- [Workflow API Service](src/lib/api/WorkflowService.ts)
- [Dataset API Service](src/lib/api/DatasetService.ts)
- [User and Role API Service](src/lib/api/UserAndRoleService.ts)
- [Invite API Service](src/lib/api/InviteService.ts)
- [Dashboard API Service](src/lib/api/DashboardService.ts)
- [Dataset API Service](src/lib/api/DatasetService.ts)


## Wordpress CMS

The Wordpress CMS is used to manage the content of the website. The Wordpress API is used to fetch the content from the CMS. Pages are fetched from the API based on slug.

Website navigation and footer links are managed in the Wordpress menu section. The menu is fetched from the API and used to render the navigation and footer links. 

[Wordpress Class](src/lib/wordpress.ts) is used to communicate with the Wordpress API. This class is not under API Services since it is not used to fetch data for the application, but to fetch data for the website content. In addition, the Wordpress Class is used directly, without a context, because Next.js fetches the data on the server side.

The Wordpress menu slugs are found in the translation dictionaries for different locales. See [Internationalisation](#internationalisation) for more information.

For example:
- `primary-menu-en` -> English website top navigation
- `footer-menu-fi` -> Finnish website footer links

See `src/components/website/websiteFooter.tsx` and `src/components/website/websiteNavigation.tsx` for more information.

We use ACF (Advanced Custom Fields) to create custom fields for the Wordpress posts and pages. The key thing in these fields are sections, which are used to create the structure of the page. Each section can have multiple fields, such as text, image, or repeater fields. 

To render the Wordpress content we use 2 different components:
- `@/components/WebsitePageContent` -> used to render Wordpress Gutenberg editor content. Mainly used for basic text pages like Privacy Policy or Articles
- `@/components/WebsiteSections` -> used to render Wordpress ACF content. This component is used for more complex pages like the homepage or the workspace page. The component takes the sections from the Wordpress API, loops through them, and renders the correct component for each section.

In Wordpress we use Polylang to manage translations.

## Yarn v2 Migration Guide

If you are migrating from Yarn v1 to Yarn v2, please follow the official migration guide provided by Yarn: [Yarn v2 Migration Guide](https://yarnpkg.com/migration/guide).

To quickly migrate, you can use the following commands:

1. Set Yarn to use version 2:

   ```bash
   yarn set version 4.3.0
   ```

2. Create or update the `.yarnrc.yml` file in your project root:

   ```yaml
   nodeLinker: node-modules
   yarnPath: .yarn/releases/yarn-4.3.0.cjs
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

## Additional Information

The development environment can be found at:

- Next.js: [https://irmin.dev](https://irmin.dev)
- API: [https://api.irmin.dev](https://api.irmin.dev)

Both are hosted on DigitalOcean. The API uses Forge for deployments.

If you have any questions or need further assistance, please contact us via email or create a new issue on Github.

Thank you for contributing to the Irmin project!
