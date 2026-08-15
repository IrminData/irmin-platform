// Command install-duckdb-extensions preloads runtime DuckDB extensions into
// the application user's home during the container build.
package main

import (
	"context"
	"fmt"
	"irmin-api/duckdb"
	"log/slog"
	"os"
)

func main() {
	if err := run(context.Background()); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run(ctx context.Context) error {
	return duckdb.InstallRuntimeExtensions(ctx, false, slog.Default())
}
