# Environment Configuration

This document explains the various environment properties used in the application, their purposes, and where to obtain them.

## Environment Properties

### 1. NEXT_PUBLIC_BASE_URL

- **Description**: The base URL of the application.
- **Purpose**: Used to construct absolute URLs for routing within the application.
- **Example**: `NEXT_PUBLIC_BASE_URL=https://irmin.dev`
- **Where to get it**: This is the primary domain where your application is hosted. You can get this from your domain provider or hosting service.

### 2. REQUIRE_ENV_AUTH

- **Description**: Flag to determine if environment-specific authentication is required.
- **Purpose**: Enables or disables environment authentication for accessing certain environments like development and staging. Should always be set to `false` in production environments where other authentication mechanisms are in place
- **Example**: `REQUIRE_ENV_AUTH=true`
- **Where to get it**: This is a configuration setting typically determined by your application's security requirements. Set it to `true` if you need to restrict access based on environment settings.

### 3. ENV_PASSWORD

- **Description**: Password used for environment-specific authentication.
- **Purpose**: Provides a password for accessing protected environments such as development or staging environments. This is not needed for production environments where other authentication mechanisms are in place.
- **Example**: `ENV_PASSWORD=devpassword`
- **Where to get it**: This should be set by your development or operations team and should be kept secure. Only users who need to access the protected environment should know this password.

### 4. NEXT_PUBLIC_API_URL

- **Description**: The URL for the API endpoint.
- **Purpose**: Specifies the API endpoint that the front-end application will interact with.
- **Example**: `NEXT_PUBLIC_API_URL=https://api.irmin.dev`
- **Where to get it**: This is provided by your back-end team or the service hosting your API. It should be publicly accessible if it's meant to be used by the front-end application.

### 5. NEXT_PUBLIC_OFFLINE_MODE

- **Description**: Flag to determine if the application should run in offline mode.
- **Purpose**: Toggles the application's offline capabilities. When set to `true`, the application will operate without requiring network connectivity. Useful for working in environments with limited or no internet access. In production environments, this should be set to `false`.
- **Example**: `NEXT_PUBLIC_OFFLINE_MODE=false`
- **Where to get it**: This is a configuration setting determined by the requirements of your application. Set it to `true` if you need to enable offline mode for testing or specific use cases.

## Example Configuration

Here is an example of how the environment variables should be set in your `.env` file:

```dotenv
NEXT_PUBLIC_BASE_URL=https://irmin.dev
REQUIRE_ENV_AUTH=true
ENV_PASSWORD=devpassword
NEXT_PUBLIC_API_URL=https://api.irmin.dev
NEXT_PUBLIC_OFFLINE_MODE=false
```
