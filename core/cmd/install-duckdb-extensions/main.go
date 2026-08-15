// Command install-duckdb-extensions downloads the pinned DuckDB extensions
// required by the runtime image. It is run only while building the container.
package main

import (
	"database/sql"
	"log"

	_ "github.com/marcboeker/go-duckdb"
)

func main() {
	database, err := sql.Open("duckdb", "")
	if err != nil {
		log.Fatal(err)
	}
	defer database.Close()
	for _, extension := range []string{"excel", "spatial"} {
		if _, err = database.Exec("INSTALL " + extension); err != nil {
			log.Fatalf("install %s extension: %v", extension, err)
		}
	}
}
