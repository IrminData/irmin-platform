<img src="https://github.com/IrminData/irmin-frontend/blob/development/public/irmin-logo-light.svg" width="200">

# Irmin web (irmin-frontend)

This repository contains the code for Irmin frontend, built using Next.js, TypeScript and Tailwind.

## Project Links

To access dev/staging environments of `irmin-frontend` the password is: `LeTamiNtItENowNp`.
To access the internal PHPDoc documentation of the API, the user is `irmin`, and the password is `6svtkffnp9iaj47kzbla`

| Project | Repository | Dev | Documentation | Admin/CMS |
| ----------------------------------- | --------------------------------------------------------- | ------------------------------------ | ---------------------------------- | ----------------------------------------------- |
| Irmin Web App (Next.js, TypeScript) | [Repository](https://github.com/IrminData/irmin-frontend) | [irmin.dev](https://irmin.dev)     | [Internal TSDoc](https://irmin.dev/tsdocs)   | [WordPress CMS](https://cms.irmin.dev/wp-admin) |
| Irmin API (Laravel, PHP)            | [Repository](https://github.com/IrminData/irmin-api)      | [api.irmin.dev](https://api.irmin.dev) | [API Docs](https://api.irmin.dev/docs) - [Internal PHPDoc](https://internal-api-documentation.irmin.dev/docs)  | |


## Table of Contents

- [How to Contribute?](#how-to-contribute)
- [Prerequisites and stack](#prerequisites-and-stack)
- [Environment Configuration](#environment-configuration)
- [Running the Project](#running-the-project)
- [TypeScript and Types](#typescript-and-types)
- [Static data](#static-data)
- [Offline mode](#offline-mode)
- [Irmin API](#irmin-api)
- [API Services](#api-services)
- [Internationalisation](#internationalisation)
- [Contexts](#contexts)
  - [Identity and Access Management (IAMContext)](#identity-and-access-management-iamcontext)
  - [LocaleContext](#localecontext)
  - [PopupContext](#popupcontext)
  - [BucketContext](#bucketcontext)
  - [WorkspaceContext](#workspacecontext)
- [Wordpress CMS](#wordpress-cms)
- [Yarn v2 Migration Guide](#yarn-v2-migration-guide)
- [TypeDoc documentation](#typedoc-documentation)

## How to Contribute?

1. Create a branch from `development` using this structure: `name/type-description-ticketID` or `name/type-description`.
   - Example: `tim/feat-files-123123`, `alice/feat-auth-389123`, `kamala/fix-login-error`
2. Make your changes.
3. Push your changes to the branch.
4. Run tests and ensure the build is successful.
5. Create a pull request to `development`.
6. Await review and approval from a team member.
7. Merge the pull request after approval.
8. Delete the branch after merging.

**Important**: Never push directly to `development` or `production`. Always create a pull request for changes.

### Prerequisites and stack

Ensure you have the following installed:

- Node.js (v20.x+)
- Yarn (v2.x+). See [Yarn v2 Migration Guide](#yarn-v2-migration-guide) for migration details.

In the web app we use TypeScript, Next.js (React framework) with the App Router enabled, and Tailwind (styles).
We also use ESLint and Prettier for code quality.

[Next.js documentation](https://nextjs.org/docs/app)

## Environment Configuration

Create a `.env` file in the project root. Add the following environment variables:

```text
NEXT_PUBLIC_BASE_URL=https://irmin.dev  # Base URL of the application
REQUIRE_ENV_AUTH=true  # Enable environment-specific authentication
ENV_PASSWORD=devpassword  # Password for environment authentication
NEXT_PUBLIC_API_URL=https://api.irmin.dev  # API endpoint URL
NEXT_PUBLIC_OFFLINE_MODE=false  # Toggle offline mode
NEXT_PUBLIC_WORDPRESS_URL=https://cms.irmin.dev  # WordPress CMS URL
NEXT_PUBLIC_ENVIRONMENT_TYPE=development  # Environment type
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

When offline mode is enabled something is always returned for API requests in API Services. The offline mode returns objects from example objects eg. [src/types/examples/apiObjects.ts](src/types/examples/apiObjects.ts) depending on what would be the APIs expected return type.

Note! It is not meant for anything but local use.

## API Services

To call the API, we use API Services. These services contain the API endpoints and the logic for calling the API. The API Services are located in the `src/services/api` directory. Each service corresponds to a specific resource in the API.

Please note that accessing a lot of things on the API requires user to be authenticated and the API call be made from the client. This is because the API relies on a cookie set on the API domain. This is why most API Services are not used on the server side, but only on the client side.

Every API Service function for fetching the API should follow the same structure:

1. The function should be async and return a Promise.
2. The function should call the API using the fetchWithCredentials utility function.
3. The function should return the response itself, not the data from the response. The data should be extracted in the component that calls the service.
4. The function should be documented with TypeDoc/TypeDoc comments. The comments should include a description of the function, the parameters, and the return value. Also, if available add the link to the API documentation for that endpoint. If not available, add a TODO note that the API documentation is not available yet.
5. The function should be able to handle Offline Mode and Development Environments needs. This means returning static data when the API request fails or when Offline Mode is enabled.

Some services have been created before the API has been fully implemented. In these cases, when the environment is set to development, the services return example objects from the [apiObjects.ts](src/types/examples/apiObjects.ts) file. See [Static data](#static-data) section of this README for more information

Examples:

[src/services/api/BucketService.ts](src/services/api/BucketService.ts) -> contains a list of endpoints for Buckets the frontend will be calling.
[src/types/examples/apiObjects.ts](src/types/examples/apiObjects.ts) -> contains example API objects of certain types. These objects are used in development when the API request fails or if Offline Mode is enabled
[src/types/api/Bucket.ts](src/types/api/Bucket.ts) -> contains types for Bucket resources, which the BucketService and ExampleObject refer to.

## Internationalisation

The website is available in multiple languages.

The locale is set based on the URL path. For example, `/en` is English, `/fi` is Finnish, and so on. See route `src/app/[lang]`.

If the language is set in the URL, the website will be displayed in that language. If the language is not set in the URL, the website will try to get the users browser language. If the browser language is not supported, the default language will be used.

If user manually switches languages, the preferred language is stored in cookies and used in the future.

Languages, default language and available locales are defined in [src/dictionaries/index.ts](src/dictionaries/index.ts).

- [src/middleware.ts](src/middleware.ts) -> Middleware for setting the locale based on the URL path or browser language.
- [src/context/LocaleContext.tsx](src/context/LocaleContext.tsx) -> Context for managing the locale and translations state across the application.
- [src/dictionaries/index.ts](src/dictionaries/index.ts) -> Responsible for providing translation lists, setting the default language, and available locales.

Dictionaries are JSON objects which are used to translate the website content. They are used in the components to translate the content based on the locale. The key is the translation key and the value is the translation itself. `getDictionary()` function in `dictionaries/index.ts` is used to get the correct dictionary based on the locale.

Dictionaries can be found in the `src/dictionaries` folder.

For example see:

- [English dictionary](src/dictionaries/en.ts) -> English translations
- [Finnish dictionary](src/dictionaries/fi.ts) -> Finnish translations

## Contexts

Contexts are used to manage global state in the application. Contexts are located in the `src/context` directory. Each context corresponds to a specific piece of global state, ensuring that data is easily accessible throughout the application without the need for prop drilling.

Contexts are responsible for directly using the [API Services](#api-services) to fetch and manage data. This ensures a clear separation of concerns and promotes a more maintainable codebase.

When creating a new context, ensure it follows the same structure as the existing contexts.

### Identity and Access Management (IAMContext)

[src/context/IAMContext.tsx](src/context/IAMContext.tsx)

IAMContext is used to manage the user profile state across the application. It provides the user profile data, function to refetch and update the user profile data. It also provides functions to login, register and logout the user.

IAMProvider is wrapping the root layout of the application.

The application will know that a user is not logged in if the user profile data is not available. 

This context provides the application with logic to communicate with the [Auth API Service](src/services/api/AuthService.ts) and
[Profile API Service](src/services/api/ProfileService.ts).

[ProfileService](src/services/api/ProfileService.ts) will avoid throwing an error on getProfile if the user is not logged in. Instead, it will return null.

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

See [Bucket API Service](src/services/api/BucketService.ts) and [the Editor](src/app/[lang]/portal/[workspace]/editor/layout.tsx) for more information.

### WorkspaceContext

[src/context/workspace/WorkspaceContext.tsx](src/context/workspace/WorkspaceContext.tsx)

This context is responsible for managing the workspace state and data across the application. 
In addition, it provides the application with logic to communicate with:

- [Workspace API Service](src/services/api/WorkspaceService.ts)
- [Dashboard API Service](src/services/api/DashboardService.ts)
- [Workflow API Service](src/services/api/WorkflowService.ts)
- [Connection Workflow API Service](src/services/api/ConnectionWorkflowService.ts)
- [Export Workflow API Service](src/services/api/ExportWorkflowService.ts)
- [Action Workflow API Service](src/services/api/ActionWorkflowService.ts)
- [Dataset API Service](src/services/api/DatasetService.ts)
- [Invite API Service](src/services/api/InviteService.ts)
- [User and Role API Service](src/services/api/UserAndRoleService.ts)

The context, hooks, provider etc. are split into multiple files for clarity and to avoid any single file becoming too large.

## Wordpress CMS

The Wordpress CMS is used to manage the content of the website. The Wordpress API is used to fetch the content from the CMS. Pages are fetched from the API based on slug.

Website navigation and footer links are managed in the Wordpress menu section. The menu is fetched from the API and used to render the navigation and footer links.

[Wordpress Service](src/services/wordpress.ts) is used to communicate with the Wordpress API. This service is not under API Services since it is not used to fetch data from the `irmin-api` or any other app data. But instead is used to fetch data for the website content. In addition, the Wordpress Service is used directly, without a context, because Next.js fetches the data on the server side.

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
