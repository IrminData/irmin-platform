# DuckDB in-memory client

This package loads in-memory Go data or file bytes into DuckDB, executes SQL,
and merges multiple sources without requiring external object storage.

## Quick start

```go
package main

import (
	"context"
	"fmt"
	"log"
	"log/slog"

	"github.com/IrminData/irmin-platform/sdks/go/duckdb"
)

func main() {
	ctx := context.Background()
	client, err := duckdb.NewInMemoryClient(ctx, slog.Default())
	if err != nil {
		log.Fatal(err)
	}
	defer client.Close()

	data := []map[string]any{
		{"id": 1, "name": "Ada"},
		{"id": 2, "name": "Linus"},
	}
	if err := client.CreateTableFromData(ctx, "users", data); err != nil {
		log.Fatal(err)
	}

	rows, err := client.QueryToMap(ctx, "SELECT * FROM users ORDER BY id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println(rows)
}
```

## Main operations

- `CreateTableFromData` loads `[]map[string]any` into a table.
- `LoadFileFromBytes` detects a supported format from the supplied filename.
- `ExecuteQuery` and `ExecuteNonQuery` expose lower-level SQL operations.
- `QueryToMap` returns query results as `[]map[string]any`.
- `MergeDataSources` and `MergeFiles` combine inputs using a `MergeStrategy`.

Every database operation accepts a `context.Context`. Close the client when it
is no longer needed.

See [SUPPORTED_FILE_FORMATS.md](SUPPORTED_FILE_FORMATS.md) for the maintained
format matrix. Format support can also depend on DuckDB extensions available in
the runtime environment.
