// Command install-duckdb-extensions downloads the pinned DuckDB extensions
// required by the runtime image. It is run only while building the container.
package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	_ "github.com/marcboeker/go-duckdb"
)

const installTimeout = 10 * time.Minute

func main() {
	if err := installExtensions(); err != nil {
		log.Print(err)
		os.Exit(1)
	}
}

func installExtensions() error {
	database, err := sql.Open("duckdb", "")
	if err != nil {
		return err
	}
	defer database.Close()
	ctx, cancel := context.WithTimeout(context.Background(), installTimeout)
	defer cancel()
	for _, extension := range []string{"excel", "spatial"} {
		if _, err = database.ExecContext(ctx, "INSTALL "+extension); err != nil {
			return fmt.Errorf("install %s extension: %w", extension, err)
		}
	}
	return nil
}
