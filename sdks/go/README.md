# Irmin SDK for Go-lang

Structure of the SDK project:

```bash
github.com/IrminData/irmin-sdk-go/
├── core-api/        # Irmin Core API Client
├── connector/       # Irmin Connector API Client, to talk with connectors
├── models/          # Data models for the API responses and other data structures
├── utils/           # Utility functions provided by the SDK
```

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
