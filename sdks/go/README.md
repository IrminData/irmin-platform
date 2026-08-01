# Irmin SDK for Go

The Go SDK provides typed clients, shared models, validation, connector
operations, observability primitives, and in-memory DuckDB helpers for the
Irmin platform.

## Installation

The SDK is a nested Go module in the Irmin platform monorepo. Install a
released version with:

```bash
go get github.com/IrminData/irmin-platform/sdks/go/api@v0.1.0
```

Install the package you use so Go records its transitive dependencies; replace
`api` with `models`, `connectorsclient`, `duckdb`, or another package as needed.
The module path is `github.com/IrminData/irmin-platform/sdks/go`. Repository
tags include the module directory prefix, for example `sdks/go/v0.1.0`; Go
users still request the ordinary semantic version `v0.1.0`.

## Packages

| Package | Purpose |
| --- | --- |
| `api` | Client for the Irmin Core API |
| `connectorsclient` | Client for connector-service metadata and operations |
| `models` | Shared API and connector data types |
| `validator` | Irmin validation rules and structured errors |
| `sqids` | SQID generation and validation |
| `duckdb` | In-memory loading, querying, and merging with DuckDB |
| `observability` | Progress-event vocabulary for long-running operations |
| `utils` | MIME, archive, multipart, and compute helpers |

## Core API quick start

```go
package main

import (
	"context"
	"fmt"
	"log"

	irmincore "github.com/IrminData/irmin-platform/sdks/go/api"
)

func main() {
	ctx := context.Background()
	client := irmincore.NewClient("https://api.irmin.co/api", "your-token", "en")

	workspace, _, err := client.CreateWorkspace(ctx, irmincore.CreateWorkspaceRequest{
		Name:        "Example workspace",
		Description: "Created with the Irmin Go SDK",
	})
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println(workspace.Name)
}
```

Validate a request without sending it:

```go
if err := client.ValidateRequest(request); err != nil {
	return err
}

result := client.ValidateRequestEnhanced(request)
if result.HasErrors() {
	return result
}
```

## Connector client

Connector service URLs include the connector-specific prefix expected by the
deployment, such as `/stripe` or `/postgres`.

```go
connector := connectorsclient.NewClient(
	"https://connectors.example.com/postgres",
	"your-system-token",
)

info, err := connector.GetInfo(ctx)
```

Long-running operations use `StartOperationPull`, `StartOperationPush`, or
`StartOperationPatch` with the corresponding request type. Use
`SubscribeToChanges` and `UnsubscribeFromChanges` for webhook subscriptions.

## In-memory DuckDB

```go
ctx := context.Background()
client, err := duckdb.NewInMemoryClient(ctx, slog.Default())
if err != nil {
	return err
}
defer client.Close()

data := []byte("name,age\nAda,36\nLinus,55\n")
if err := client.LoadFileFromBytes(ctx, data, "users.csv", "users"); err != nil {
	return err
}

rows, err := client.QueryToMap(ctx, "SELECT * FROM users ORDER BY age")
```

See [duckdb/README.md](duckdb/README.md) for supported operations and formats.

## Development

From the repository root:

```bash
go test -timeout 2m ./sdks/go/...
cd sdks/go && golangci-lint run
```

Regenerate committed package documentation after changing exported APIs:

```bash
cd sdks/go
bash ./generate-docs.sh
```

Release maintainers should follow
[the Go SDK release guide](../../docs/releasing-go-sdk.md). Do not create an
unprefixed `vX.Y.Z` repository tag for this nested module.

## License

The Go SDK is licensed under the [Elastic License 2.0](LICENSE).
