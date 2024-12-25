# Irmin SDK for Go-lang

Structure of the SDK project:

```bash
irmin-sdk/
├── client/          # SDK core client
├── services/        # Service implementations
├── models/          # Data models
├── examples/        # Example usage files
├── go.mod           # Go module file
```

## Development environment setup

1. Install Go-lang: https://golang.org/doc/install
2. Install the SDK dependencies:

```bash
go mod tidy
```

3. Create a `.env` file in the root directory of the SDK and add the following environment variables:

```bash
BASE_URL=https://api.irmin.dev
API_TOKEN=your-api-token
LOCALE=en
```
