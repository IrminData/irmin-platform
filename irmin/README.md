<img src="https://github.com/IrminData/irmin-frontend/blob/development/public/irmin-logo-light.svg" width="200" alt="Irmin Logo">

# Irmin Core API

Irmin Core API is a RESTful API that provides a unified interface to interact with Irmin services. It is built in Go and uses the [Fiber](https://github.com/gofiber/fiber) web framework.

## Commands

**Install dependencies**
`go mod download`

**Update dependencies**
`go mod tidy` and `go get -u ./...`

**Build**
`go build -o out`

And then run the binary file `./out`

**Run**
`go run main.go`

## Linting

This project uses [golangci-lint](https://golangci-lint.run/) for code quality checks. The configuration is defined in `.golangci.yml`.

**Install golangci-lint**

```bash
# macOS
brew install golangci-lint

# Linux
curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b $(go env GOPATH)/bin v1.55.2
```

**Run the linter**

```bash
golangci-lint run
```

**Run the linter with autofix**

```bash
golangci-lint run --fix
```

The linter is configured to be strict but practical, with a focus on code quality and maintainability. It includes checks for:

- Code formatting (goimports, golines)
- Error handling
- Code complexity
- Security issues
- Best practices
- And many more

## Environment Variables

Create a `.env` file in the root directory of the project and add the following environment variables:

```bash
PORT=8082 # Port to run the API server on
URL=http://localhost:8082 # URL of the API server
TOKEN=... # Token to authenticate system requests to the API

HELMET_ENABLED=true # Enable helmet
CORS_ENABLED=true # Enable CORS
CORS_ORIGINS=https://console.irmin.dev,https://connectors.irmin.dev # Allowed origins for CORS

ORCHESTRATOR_ENABLED=true # Enable the orchestrator

SQID_ALPHABET=abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890 # Alphabet to use for SQIDs

DATABASE_CONNECTION_STRING=postgresql://user:pwd@localhost:5432/irmin # Postgres DB connection string

RESEND_API_KEY=re_... # Resend API Key for emails

CONSOLE_URL=https://console.irmin.dev # URL of the Irmin Console

INVITE_EXPIRES_IN_DAYS=7 # Number of days before an invite expires

CLERK_PUBLIC_KEY=pk_test_... # Clerk Public API Key
CLERK_SECRET_KEY=sk_test_... # Clerk Secret API Key
CLERK_SIGNING_KEY=... # Clerk Signing Key for JWT
CLERK_SIGNING_ALGORITHM=HS512 # Clerk Signing Algorithm for JWT

LAKE_FS_URL=https://lake.irmin.dev # URL of the Lake FS instance for versioning
LAKE_FS_ACCESS_KEY_ID=... # Access key ID for the Lake FS instance
LAKE_FS_SECRET_ACCESS_KEY=... # Secret access key for the Lake FS instance

S3_ENDPOINT=https://ams3.digitaloceanspaces.com # Endpoint of the S3-compatible object store
S3_BUCKET=irmin-object-store # Bucket name of the S3-compatible object store
S3_FOLDER=... # Base folder name of the S3-compatible object store
S3_REGION=us-east-1 # Region of the S3-compatible object store
S3_ACCESS_KEY_ID=... # Access key ID for the S3-compatible object store
S3_ACCESS_SECRET=... # Secret access key for the S3-compatible object store

TEST_CONNECTOR_BASE_URL=https://connectors.irmin.dev/postgres # Base URL of the connector to test with
TEST_CONNECTOR_TOKEN=... # Connector's operation token for testing
TEST_CONNECTOR_PATH=/test.json # Path to the test file in the connector
TEST_OBJECT_NAME=test.json # Name of the test object in the object store, expected to be a structured JSON file
TEST_WORKSPACE=test-workspace # Workspace to test with
TEST_REPOSITORY=test-repository # Repository to test with
TEST_BRANCH=dev # Branch to test with
TEST_TAG=test-tag # Tag to test with
```
