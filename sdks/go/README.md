# Irmin SDK for Go-lang

Structure of the SDK project:

```bash
irmin-sdk/
├── client/          # API core client
├── services/        # API service implementations
├── models/          # Data models for the API responses and other data structures
├── utils/           # Utility functions provided by the SDK
├── static/          # Mock data files for testing
├── examples/        # Example usage files
├── test.go          # Test file to execute all the examples in a correct order
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

## Running the examples

To execute the `test.go` file and run all the examples in the correct order, use the following command:

```bash
go run test.go

# To run a specific example, use the following commands:

go run test.go -api       # Run only API tests
go run test.go -utils     # Run only utility tests
go run test.go -api -utils  # Run both API and utility tests
```
