# Environment Configuration

This document explains the various environment properties used in the application, their purposes, and where to obtain them.

## Environment Properties

### 1. NEXT_PUBLIC_BASE_URL

- **Description**: The base URL of the application.
- **Purpose**: Used to construct absolute URLs for routing within the application.
- **Example**: `NEXT_PUBLIC_BASE_URL=https://irmin.dev`

### 2. REQUIRE_ENV_AUTH

- **Description**: Flag to determine if environment-specific authentication is required.
- **Purpose**: Enables or disables environment authentication for accessing certain environments like development and staging. Should always be set to `false` in production environments where other authentication mechanisms are in place
- **Example**: `REQUIRE_ENV_AUTH=true`

### 3. ENV_PASSWORD

- **Description**: Password used for environment-specific authentication.
- **Purpose**: Provides a password for accessing protected environments such as development or staging environments. This is not needed for production environments where other authentication mechanisms are in place.
- **Example**: `ENV_PASSWORD=devpassword`

### 4. NEXT_PUBLIC_API_URL

- **Description**: The URL for the API endpoint.
- **Purpose**: Specifies the API endpoint that the front-end application will interact with.
- **Example**: `NEXT_PUBLIC_API_URL=https://api.irmin.dev`

### 5. NEXT_PUBLIC_OFFLINE_MODE

- **Description**: Flag to determine if the application should run in offline mode.
- **Purpose**: Toggles the application's offline capabilities. When set to `true`, the application will operate without requiring network connectivity. Useful for working in environments with limited or no internet access. In production environments, this should be set to `false`.
- **Example**: `NEXT_PUBLIC_OFFLINE_MODE=false`

### 6. NEXT_PUBLIC_WORDPRESS_URL

- **Description**: The URL for the WordPress CMS.
- **Purpose**: Specifies the URL of the WordPress CMS that the front-end application will interact with.
- **Example**: `NEXT_PUBLIC_WORDPRESS_URL=https://cms.irmin.dev`

### 7. NEXT_PUBLIC_ENVIRONMENT_TYPE

- **Description**: The type of environment the application is running in.
- **Purpose**: Identifies the type of environment the application is running in, such as `development`, `staging`, or `production`.
- **Example**: `NEXT_PUBLIC_ENVIRONMENT_TYPE=development`

## Example Configuration

Here is an example of how the environment variables should be set in your `.env` file:

```dotenv
NEXT_PUBLIC_BASE_URL=https://irmin.dev
REQUIRE_ENV_AUTH=true
ENV_PASSWORD=devpassword
NEXT_PUBLIC_API_URL=https://api.irmin.dev
NEXT_PUBLIC_OFFLINE_MODE=false
NEXT_PUBLIC_WORDPRESS_URL=https://cms.irmin.dev
NEXT_PUBLIC_ENVIRONMENT_TYPE=development
```
