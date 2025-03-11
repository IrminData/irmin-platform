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

DATABASE_CONNECTION_STRING=postgresql://user:pwd@localhost:5432/irmin

DATA_ENGINE_URL=http://localhost:8081
DATA_ENGINE_TOKEN=...

S3_ENDPOINT=https://ams3.digitaloceanspaces.com
S3_BUCKET=irmin-object-store
S3_FOLDER=...
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=...
S3_ACCESS_SECRET=...
```
