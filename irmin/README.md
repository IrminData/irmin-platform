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

## Environment Variables

Create a `.env` file in the root directory of the project and add the following environment variables:

```bash
PORT=8082
URL=http://localhost:8082
TOKEN=...

SQID_ALPHABET=abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890

DATABASE_CONNECTION_STRING=postgresql://user:pwd@localhost:5432/irmin

RESEND_API_KEY=re_...

CONSOLE_URL=https://console.irmin.dev

INVITE_EXPIRES_IN_DAYS=7

CLERK_PUBLIC_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_SIGNING_KEY=...
CLERK_SIGNING_ALGORITHM=HS512

LAKE_FS_URL=https://lake.irmin.dev # URL of the Lake FS instance for versioning
LAKE_FS_ACCESS_KEY_ID=... # Access key ID for the Lake FS instance
LAKE_FS_SECRET_ACCESS_KEY=... # Secret access key for the Lake FS instance

S3_ENDPOINT=https://ams3.digitaloceanspaces.com
S3_BUCKET=irmin-object-store
S3_FOLDER=...
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=...
S3_ACCESS_SECRET=...

TEST_CONNECTOR_BASE_URL=https://connectors.irmin.dev/postgres # Base URL of the connector to test with
TEST_CONNECTOR_TOKEN=... # Connector's operation token for testing
TEST_CONNECTOR_PATH=/test.json # Path to the test file in the connector
TEST_OBJECT_NAME=test.json # Name of the test object in the object store, expected to be a structured JSON file
TEST_WORKSPACE=test-workspace # Workspace to test with
TEST_REPOSITORY=test-repository # Repository to test with
TEST_BRANCH=dev # Branch to test with
TEST_TAG=test-tag # Tag to test with
```
