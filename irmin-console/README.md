<img src="https://github.com/IrminData/.github/blob/development/irmin-logo-light.svg" width="200">

# Irmin web (irmin-frontend)

This repository contains the code for Irmin frontend, built using Next.js, TypeScript and Tailwind.

## Project Links

To access dev/staging environments of `irmin-frontend` the password is: `LeTamiNtItENowNp`.
To access the internal PHPDoc documentation of the API, the user is `irmin`, and the password is `6svtkffnp9iaj47kzbla`

| Project                             | Repository                                                | Dev                                    | Documentation                                                                                                 | Admin/CMS                                       |
| ----------------------------------- | --------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Irmin Web App (Next.js, TypeScript) | [Repository](https://github.com/IrminData/irmin-frontend) | [irmin.dev](https://irmin.dev)         | [Internal TSDoc](https://irmin.dev/tsdocs)                                                                    | [WordPress CMS](https://cms.irmin.dev/wp-admin) |
| Irmin API (Laravel, PHP)            | [Repository](https://github.com/IrminData/irmin-api)      | [api.irmin.dev](https://api.irmin.dev) | [API Docs](https://api.irmin.dev/docs) - [Internal PHPDoc](https://internal-api-documentation.irmin.dev/docs) |                                                 |

## Table of Contents

- [How to Contribute?](#how-to-contribute)
- [Prerequisites and stack](#prerequisites-and-stack)
- [Environment Configuration](#environment-configuration)
- [Running the Project](#running-the-project)
- [Components](#components)
  - [/app directory](#app-directory)
  - [Naming conventions](#naming-conventions)
  - [No logic in /components](#no-logic-in-components)
  - [File structure](#file-structure)
- [TypeScript and Types](#typescript-and-types)
- [Static data](#static-data)
- [Offline mode](#offline-mode)
- [Irmin API](#irmin-api)
- [Server side actions](#server-side-actions)
  - [Middleware](#middleware)
  - [Route handlers](#route-handlers)
- [Services](#services)
  - [Irmin API authorisation](#irmin-api-authorisation)
  - [Core Services](#core-services)
    - [Fake data](#fake-data)
  - [Proxy Services](#proxy-services)
  - [Wordpress Service](#wordpress-service)
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
NEXT_PUBLIC_TOKEN_MAX_AGE=1800 # 30 minutes, how long are the token and profile data valid, before they are refetched
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

## Components

Components are the building blocks of the application. They are reusable pieces of UI that can be used in multiple places. Components are located in the `src/components` and `src/app` directories.

### /app directory

[Pages and Layouts](https://nextjs.org/docs/app/building-your-application/routing/pages-and-layouts) are used to provide the route content. They are located in the `/app` directory. 

We generally try to avoid using the `app` directory for anything other than defining the routes, layouts and SEO.  The actual content should be in the `/components` directory.

It is also okay to handle certain data fetching in the `app` directory components. This could be used as a sort of cache layer for generic data. Fetching user/workspace specific data, or large amounts of data this way, can be problematic.

Components in the `app` directory should be server-side rendered, and can not access any contexts or cookies on the API domain. Don't fetch something that is already fetched in contexts.

See [Server side actions](#server-side-actions) for more information.

### Naming conventions

If a component is used to provide a route Layout, it should say `LayoutWrapper` eg. `EditorLayoutWrapper`, corresponding layout for this component should be `EditorLayout`. 

If a component is used to provide a route Page content, it should say `Section`, eg. `EditorSection`, corresponding page for this component should be `EditorPage`.

Components should be named in PascalCase and should be descriptive of their purpose. 

### No logic in /components

The general idea is to keep the components as small and reusable as possible.

An attempt should be made to keep components "UI-focused" and avoid logic. If a component requires logic, move that logic to a relevant [Context](#contexts), or make a new one.

### File structure

Components are located in the `src/components` directory. Components are split into different directories and subdirectories based on their purpose.

General components are:

- `src/components/website/...` -> Components specific to the website pages
- `src/components/portal/...` -> Components specific to the portal pages
- `src/components/common/...` -> Components that are used in multiple places, like popups, buttons, lists etc.

 If a component is used only in a specific feature, it should be placed in the feature directory grouped by features, purposes or domains. 

For example: 

- `src/components/workflow/...` -> Components related to Workflows
- `src/components/workflow/action/...` -> Components related to Action Workflows
- `src/components/workspace/...` -> Components related to Workspace logic

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

When offline mode is enabled something is always returned for API requests in API Services. The offline mode returns objects from example objects eg. [src/types/examples/core](src/types/examples/core/index.ts) depending on what would be the APIs expected return type.

Note! It is not meant for anything but local use.

## Server side actions

Next.js allows for many ways of running server-side code. See [Next.js documentation](https://nextjs.org/docs/app) for more information.

Since Irmin API authorises the user with a cookie, the API cannot be called directly on the server side. 

Whenever the API is called on the server side, the token is used instead of the cookie. The token needs to be passed to the server side action from the client side. 

The token is stored in the [IAMContext](src/context/IAMContext.tsx). See [Irmin API authorisation](#irmin-api-authorisation) for more information.

### Middleware

Middleware is used to run server-side code before anything is rendered. Middleware is located in the [middleware.ts](src/middleware.ts) file.

Middleware provides redirects, setting the locale, password protection for the environment, and more.

### Route Handlers

Next.js Route handlers are used to create serverless functions as routes within the Next.js project.

[Next.js documentation on route handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

In Irmin, we use route handlers for multiple purposes:

- To build a sitemap of the project for SEO purposes
  - [src/app/sitemap.xml/route.ts](src/app/sitemap.xml/route.ts)
- To build a robots.txt file for SEO purposes
  - [src/app/robots.txt/route.ts](src/app/robots.txt/route.ts)
- To provide UI and handler for the environment access password verification
  - [src/app/api/verify-dev-access/route.ts](src/app/api/verify-dev-access/route.ts)
- To provide API routes for the frontend. Located in `src/app/api`
  - Some of the API routes are used to proxy requests to Irmin API or other internal services.
  - This is done to improve security, minimise amount of requests on the client side and improve performance.
  - See [Proxy Services](#proxy-services) for information on how these routes are used in the frontend.

## Services

### Irmin API authorisation

The API can be authorised with 2 different methods:

- Cookie based authentication: The API sets a cookie on the API domain when the user logs in. This cookie is used to authenticate the user on the API. This is the default method.

- Token based authentication: The API can also be authorised with a token. The token is returned with GET/profile and is maintaind by the [IAMContext](src/context/IAMContext.tsx). This is used when the API call is made from the server side, since the cookie is not available on the server side.

The API Services are built to handle both methods. See [internal /workspace API route](src/app/api/workspace/route.ts) for an example of how to use the token based authentication. The API routes use the API Services to fetch data and receive the token and locale from the request. Requests to the internal API routes are made using API Proxy services like the [Workspace Proxy Service](src/services/proxies/workspace.ts).

In the future, more data fetching will be done on the server side, and the token based authentication will be used more.

### Core Services

IrminCore can be found in `src/services/core/IrminCore.ts`.

To interact with the Irmin API, we utilise the `IrminCore` Class, which centralises all individual API services. 

API services leverage the `fetch`-function, provided by the `IrminCore`, to make API calls. This class manages the API call process, including default properties, request locale, and request token.

The services provided by `IrminCore` contain the API endpoints and the logic for making API calls. They are located in the `src/services/core/resources` directory. Each service corresponds to a specific resource in the API (or at least tries to, API resources are still a different thing).

All API service functions for fetching data from the API follow a consistent structure. They return a promise with a standardised return type, such as `IrminAPIResponse` and its variations.

With the Irmin Core, accessing and managing various API services is streamlined, providing a centralised and efficient way to interact with the Irmin API.

#### Fake data

Some services have been created before the API has been fully implemented. In these cases, when the environment is set to development, the services return example objects from the `src/types/examples` folder. See [Static data](#static-data) section of this README for more information

Examples:

- [src/services/core/resources/BucketService.ts](src/services/core/resources/BucketService.ts) -> contains a list of endpoints for Buckets the frontend will be calling.

- [src/types/examples/core](src/types/examples/core/index.ts) -> contains example API objects of certain types. These objects are used in development when the API request fails or if Offline Mode is enabled

- [src/types/api/Bucket.ts](src/types/api/Bucket.ts) -> contains types for Bucket resources, which the BucketService and ExampleObject refer to.

### Proxy Services

Proxy services are used to call the internal API routes. The proxy services are located in the `src/services/proxies` directory. 

See [src/services/proxies/workspace.ts](src/services/proxies/workspace.ts) for an example of a proxy service.

Note that proxy services do not need to handle example objects or offline mode, since they are only used to call the internal API routes. Those rely on other API Services, which handle the example objects and offline mode.

### Wordpress Service

[src/services/wordpress.ts](src/services/wordpress.ts) ->

The Wordpress Service is used to communicate with the Wordpress API.

Wordpress Service uses fake data when needed. See [Static data](#static-data) section of this README for more information. Example Worpdress objects can be found here: [src/types/examples/wordpressObjects.ts](src/types/examples/wordpressObjects.ts)


See [Wordpress CMS](#wordpress-cms) for more information.

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

[IAMContext](src/context/IAMContext.tsx)

IAMContext is used to manage the user profile state across the application. It provides the user profile data, function to refetch and update the user profile data. It also provides functions to login, register and logout the user.

IAMContext also fetches and stores the users API token. This token and the profile data are valid for NEXT_PUBLIC_TOKEN_MAX_AGE seconds. If the token is expired, the application will automatically refetch the token and profile data. If no profile data is available, the application will automatically log the user out.

Irmin API normally sets a cookie on the API domain when the user logs in. This cookie is used to authenticate the user on the API.
The User's token fetched and stored, to make requests to the API on the server side, since the cookie is not available on the server side.

IAMProvider is wrapping the root layout of the application.

The application will know that a user is not logged in if the user profile data is not available.

This context provides the application with logic to communicate with the [Auth API Service](src/services/core/resources/AuthService.ts) and
[Profile API Service](src/services/core/resources/ProfileService.ts).

### LocaleContext

[LocaleContext](src/context/LocaleContext.tsx)

LocaleContext is used to manage the locale and translations state across the application. It provides the current locale, current dictionary, and a function to change the locale. LocaleProvider is wrapping the root layout of the application.

See (Internationalisation)[#internationalisation] for more information.

### PopupContext

[PopupContext](src/context/PopupContext.tsx)

PopupContext is used to manage the popup state across the application. It provides functions to open and close different popups. PopupProvider is wrapping the [Portal Layout](src/app/[lang]/portal/layout.tsx) of the application, since it is only used in the portal.

The context is not using any API Services and exists mostly for convinience and to render the popups on top of other UIs.

The popup UIs can be found in the `src/components/common/popup` directory.

### BucketContext

[BucketContext](src/context/BucketContext.tsx)

BucketContext is used to manage the bucket and file navigator state across the application. It provides the bucket data, file navigator data, and a lot of functions around them.

BucketProvider is wrapping the [Workspace Layout](src/app/[lang]/portal/[workspace]/layout.tsx) of the application, since it only relates to a specific workspace.

See [Bucket API Service](src/services/core/resources/BucketService.ts) and [the Editor](src/app/[lang]/portal/[workspace]/editor/layout.tsx) for more information.

### WorkspaceContext

[WorkspaceContext](src/context/workspace/index.tsx)

This context is responsible for managing the workspace state and data across the application.

Attempts to set the current workspace on initial load. Attempts to switch to the workspace to that is found in the query params or in localStorage.

It uses the [Workspace Proxy Service](src/services/proxies/workspace.ts) to fetch the initial workspace data for the current workspace. The workspace data is stored in the context and can be accessed by the components that are wrapped in the WorkspaceProvider.

In addition, it provides the application with logic to communicate with:

- [Action Workflow API Service](src/services/core/resources/ActionWorkflowService.ts)
- [Connection Workflow API Service](src/services/core/resources/ConnectionWorkflowService.ts)
- [Connector API Service](src/services/core/resources/ConnectorService.ts)
- [Dashboard API Service](src/services/core/resources/DashboardService.ts)
- [Repository API Service](src/services/core/resources/RepositoryService.ts)
- [Export Workflow API Service](src/services/core/resources/ExportWorkflowService.ts)
- [Invite API Service](src/services/core/resources/InviteService.ts)
- [User API Service](src/services/core/resources/UserService.ts)
- [Role API Service](src/services/core/resources/RoleService.ts)
- [Widget API Service](src/services/core/resources/WidgetService.ts)
- [Workflow API Service](src/services/core/resources/WorkflowService.ts)
- [Workspace API Service](src/services/core/resources/WorkspaceService.ts)

The context, hooks, provider etc. are split into multiple files for clarity and to avoid any single file becoming too large.

## Wordpress CMS

The Wordpress CMS is used to manage the content of the website. The Wordpress API is used to fetch the content from the CMS. Pages are fetched from the API based on slug.

Website navigation and footer links are managed in the Wordpress menu section. The menu is fetched from the API and used to render the navigation and footer links.

[Wordpress Service](src/services/wordpress.ts) is used to communicate with the Wordpress API. This service is not under API Services since it is not used to fetch data from the `irmin-api` or any other app data. But instead is used to fetch data for the website content. In addition, the Wordpress Service is used directly, without a context, because Next.js fetches the data on the server side.

The Wordpress menu slugs are found in the translation dictionaries for different locales. See [Internationalisation](#internationalisation) for more information.

For example:

- `primary-menu-en` -> English website top navigation
- `footer-menu-fi` -> Finnish website footer links

See `src/components/website/footer/WebsiteFooter.tsx` and `src/components/website/navigation/WebsiteNavigation.tsx` for more information.

We use ACF (Advanced Custom Fields) to create custom fields for the Wordpress posts and pages. The key thing in these fields are sections, which are used to create the structure of the page. Each section can have multiple fields, such as text, image, or repeater fields.

To render the Wordpress content we use 2 different components:

- `@/components/website/templates/PageContent` -> used to render Wordpress Gutenberg editor content. Mainly used for basic text pages like Privacy Policy or Articles
- `@/components/website/templates/PageSections` -> used to render Wordpress ACF content. This component is used for more complex pages like the homepage or the workspace page. The component takes the sections from the Wordpress API, loops through them, and renders the correct component for each section.

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
