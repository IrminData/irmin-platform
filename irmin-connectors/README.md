<img src="https://github.com/IrminData/irmin-frontend/blob/development/public/irmin-logo-light.svg" width="200" alt="Irmin Logo">

# Irmin Connectors

Connectors are a universal way to interact with external services, data sources, and export targets. They are applications that interface with Irmin for data import and export.

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

**Run with hot reloading (recommended for development)**
`air`

This project includes [Air](https://github.com/air-verse/air) configuration for hot reloading during development. Air automatically rebuilds and restarts the application when you make changes to the code. Follow the instructions in the Air README to install it.

**Run with flags**
`go run main.go -skip-registrations` or `air -- -skip-registrations` (skip connector registrations with the Irmin API)

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
PORT=8080
URL=http://localhost:8080

PREFORK_ENABLED=true
HELMET_ENABLED=true
CORS_ENABLED=true
CORS_ORIGINS=https://api.irmin.dev

IRMIN_API_BASE_URL=https://api.irmin.dev
IRMIN_API_TOKEN=...

DATABASE_CONNECTION_STRING=postgres://user:password@localhost:5432/database
```

## Creating a new connector

To add a new connector, create a new directory in the `connectors` directory with the name of the connector.

As a base you can copy one of the existing connectors and modify it to your needs.

Please make sure to point to your new connector in the `connectors/connectors.go` file. See the comments in the file for more information.

You can store public assets, like the logo of the connector, in the `public` directory.
