package postgresControllers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	postgresClient "irmin-connectors/controllers/postgres/client"
	"irmin-connectors/utils"
	"net/http"
	"strings"

	"github.com/IrminData/irmin-sdk-go/models"
)

func OperationPatch(w http.ResponseWriter, r *http.Request) {
	// Make sure the request is authorized by validating the operation token
	if !utils.ValidateOperationToken(defaultConnectorInfo.Name, w, r) {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Parse the form data (including file uploads)
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		http.Error(w, "Invalid form data: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Prepare a context for database operations
	ctx := context.Background()

	// Initialise the Postgres client
	dbClient, database, err := postgresClient.InitPostgresClient(ctx, r)
	if err != nil || database == nil || dbClient == nil {
		http.Error(w, "Failed to initialise Postgres client: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer dbClient.Close()

	// Retrieve the patch file from the form
	file, _, err := r.FormFile("patches")
	if err == http.ErrMissingFile {
		http.Error(w, "No JSON patch file uploaded with form field 'patches'", http.StatusBadRequest)
		return
	}
	if err != nil {
		http.Error(w, "Failed to retrieve form file: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer file.Close()

	// Read the entire file into memory
	fileBytes, err := io.ReadAll(file)
	if err != nil {
		http.Error(w, "Failed to read uploaded file: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Unmarshal the JSON into a slice of maps
	var operations []models.PatchOperation
	if err := json.Unmarshal(fileBytes, &operations); err != nil {
		http.Error(w, "Failed to parse JSON data: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Apply each patch operation to the database
	for _, op := range operations {
		// Extract details from the operation path
		_, tableName, rowIdentifier, columnName := utils.ExtractPathComponents(op.Path)

		// Start a transaction to ensure that each operation is atomic
		tx, err := dbClient.BeginTransaction(ctx)
		if err != nil {
			http.Error(w, "Failed to begin transaction: "+err.Error(), http.StatusInternalServerError)
			return
		}
		defer tx.Rollback(ctx) // Will rollback if not committed

		switch op.Op {
		case "add":
			// Make sure the value is an object
			newRow, ok := op.Value.(map[string]interface{})
			if !ok {
				http.Error(w, "Expected patch value to be an object", http.StatusBadRequest)
				return
			}

			// Build a list of columns from the new row
			var columns []string
			for col := range newRow {
				columns = append(columns, col)
			}

			// Build an INSERT statement dynamically
			// e.g. INSERT INTO "table" (col1, col2, ...) VALUES ($1, $2, ...)
			colsPlaceholder := make([]string, len(columns))
			for i := range columns {
				colsPlaceholder[i] = fmt.Sprintf("$%d", i+1)
			}
			insertSQL := fmt.Sprintf(
				`INSERT INTO "%s" (%s) VALUES (%s)`,
				tableName,
				strings.Join(quoteIdentifiers(columns), ", "),
				strings.Join(colsPlaceholder, ", "),
			)

			// Prepare the arguments
			args := make([]interface{}, len(columns))
			for i, col := range columns {
				args[i] = newRow[col]
			}

			// Execute the INSERT
			if _, err := tx.Exec(ctx, insertSQL, args...); err != nil {
				http.Error(w, "Failed to insert row: "+err.Error(), http.StatusInternalServerError)
				return
			}

		case "remove":
			// Remove a specific row identified by rowIdentifier
			deleteSQL := fmt.Sprintf(`DELETE FROM "%s" WHERE id = $1`, tableName)
			if _, err := tx.Exec(ctx, deleteSQL, rowIdentifier); err != nil {
				http.Error(w, "Failed to remove row: "+err.Error(), http.StatusInternalServerError)
				return
			}

		case "replace":
			// If the patch path is something like: /databases/<dbName>/tableName/1234/columnName
			// Then 'columnName' will be non-empty, and we only replace that single column.
			if columnName != "" {
				// singleValue is just the already-unmarshalled value in op.Value
				singleValue := op.Value

				updateSQL := fmt.Sprintf(`UPDATE "%s" SET "%s" = $1 WHERE id = $2`, tableName, columnName)
				if _, err := tx.Exec(ctx, updateSQL, singleValue, rowIdentifier); err != nil {
					http.Error(w, "Failed to replace column value: "+err.Error(), http.StatusInternalServerError)
					return
				}
			} else {
				// Otherwise, we're doing a row-level replace

				// Make sure the value is an object
				updatedRow, ok := op.Value.(map[string]interface{})
				if !ok {
					http.Error(w, "Expected patch value to be an object", http.StatusBadRequest)
					return
				}

				// Build an UPDATE statement for every column in the JSON
				setClauses := make([]string, 0, len(updatedRow))
				args := make([]interface{}, 0, len(updatedRow)+1)

				i := 1
				for col, val := range updatedRow {
					setClauses = append(
						setClauses,
						fmt.Sprintf(`"%s" = $%d`, col, i),
					)
					args = append(args, val)
					i++
				}

				updateSQL := fmt.Sprintf(
					`UPDATE "%s" SET %s WHERE id = $%d`,
					tableName,
					strings.Join(setClauses, ", "),
					i,
				)

				// Append the row identifier to the arguments
				args = append(args, rowIdentifier)

				if _, err := tx.Exec(ctx, updateSQL, args...); err != nil {
					http.Error(w, "Failed to replace row: "+err.Error(), http.StatusInternalServerError)
					return
				}
			}

		case "move":
			// A JSON Patch "move" operation must include a "from" path.
			if op.From == "" {
				http.Error(w, "Missing 'from' path in move operation", http.StatusBadRequest)
				return
			}

			// Parse the 'from' path
			_, fromTable, fromRowID, fromColumnName := utils.ExtractPathComponents(op.From)

			// We'll determine if we're dealing with column-level or row-level move
			sourceIsColumn := (fromColumnName != "")
			destIsColumn := (columnName != "")

			if sourceIsColumn && destIsColumn {
				// ---- Move a single column value ----

				// 1) SELECT the existing value from the source column
				selectSQL := fmt.Sprintf(
					`SELECT "%s" FROM "%s" WHERE id = $1`,
					fromColumnName, fromTable,
				)
				var columnValue interface{}
				if err := tx.QueryRow(ctx, selectSQL, fromRowID).Scan(&columnValue); err != nil {
					http.Error(w, "Failed to retrieve source column for move: "+err.Error(), http.StatusInternalServerError)
					return
				}

				// 2) Set the source column to NULL
				updateSourceSQL := fmt.Sprintf(
					`UPDATE "%s" SET "%s" = NULL WHERE id = $1`,
					fromTable, fromColumnName,
				)
				if _, err := tx.Exec(ctx, updateSourceSQL, fromRowID); err != nil {
					http.Error(w, "Failed to clear source column in move: "+err.Error(), http.StatusInternalServerError)
					return
				}

				// 3) Write the retrieved value into the destination column
				updateDestSQL := fmt.Sprintf(
					`UPDATE "%s" SET "%s" = $1 WHERE id = $2`,
					tableName, columnName,
				)
				if _, err := tx.Exec(ctx, updateDestSQL, columnValue, rowIdentifier); err != nil {
					http.Error(w, "Failed to write destination column in move: "+err.Error(), http.StatusInternalServerError)
					return
				}

			} else if !sourceIsColumn && !destIsColumn {
				// ---- Move an entire row ----

				// 1) SELECT * from the source row
				selectSQL := fmt.Sprintf(`SELECT * FROM "%s" WHERE id = $1`, fromTable)
				rows, err := tx.Query(ctx, selectSQL, fromRowID)
				if err != nil {
					http.Error(w, "Failed to retrieve source row for move: "+err.Error(), http.StatusInternalServerError)
					return
				}
				defer rows.Close()

				if !rows.Next() {
					http.Error(w, fmt.Sprintf("No row found with id=%v in table %s", fromRowID, fromTable), http.StatusNotFound)
					return
				}

				// Extract column info
				fieldDescriptions := rows.FieldDescriptions()
				values, err := rows.Values()
				if err != nil {
					http.Error(w, "Failed to read row data: "+err.Error(), http.StatusInternalServerError)
					return
				}

				// Build a map[columnName -> value]
				rowData := make(map[string]interface{}, len(fieldDescriptions))
				for i, fd := range fieldDescriptions {
					colName := string(fd.Name)
					rowData[colName] = values[i]
				}

				// 2) DELETE the source row
				deleteSQL := fmt.Sprintf(`DELETE FROM "%s" WHERE id = $1`, fromTable)
				if _, err := tx.Exec(ctx, deleteSQL, fromRowID); err != nil {
					http.Error(w, "Failed to remove source row in move: "+err.Error(), http.StatusInternalServerError)
					return
				}

				// 3) INSERT the row into the destination table
				//    We'll reuse the "id" column from rowData (or you could assign a new one).
				rowData["id"] = rowIdentifier // Optionally override or reuse the original.
				columns := make([]string, 0, len(rowData))
				placeholders := make([]string, 0, len(rowData))
				args := make([]interface{}, 0, len(rowData))

				i := 1
				for col, val := range rowData {
					columns = append(columns, fmt.Sprintf(`"%s"`, col))
					placeholders = append(placeholders, fmt.Sprintf("$%d", i))
					args = append(args, val)
					i++
				}

				insertSQL := fmt.Sprintf(
					`INSERT INTO "%s" (%s) VALUES (%s)`,
					tableName,
					strings.Join(columns, ", "),
					strings.Join(placeholders, ", "),
				)
				if _, err := tx.Exec(ctx, insertSQL, args...); err != nil {
					http.Error(w, "Failed to insert row into destination table in move: "+err.Error(), http.StatusInternalServerError)
					return
				}

			} else {
				// Mismatched scenario: row-level on source vs. column-level on destination (or vice versa)
				http.Error(w, "Unsupported move: cannot move row to a single column or vice versa", http.StatusBadRequest)
				return
			}

		case "copy":
			// A JSON Patch "copy" operation must include a "from" path.
			if op.From == "" {
				http.Error(w, "Missing 'from' path in copy operation", http.StatusBadRequest)
				return
			}

			_, fromTable, fromRowID, fromColumnName := utils.ExtractPathComponents(op.From)

			sourceIsColumn := (fromColumnName != "")
			destIsColumn := (columnName != "")

			if sourceIsColumn && destIsColumn {
				// ---- Copy a single column value ----

				// 1) SELECT the existing value from the source column
				selectSQL := fmt.Sprintf(
					`SELECT "%s" FROM "%s" WHERE id = $1`,
					fromColumnName, fromTable,
				)
				var columnValue interface{}
				if err := tx.QueryRow(ctx, selectSQL, fromRowID).Scan(&columnValue); err != nil {
					http.Error(w, "Failed to retrieve source column for copy: "+err.Error(), http.StatusInternalServerError)
					return
				}

				// 2) Write the retrieved value into the destination column (source remains unchanged)
				updateDestSQL := fmt.Sprintf(
					`UPDATE "%s" SET "%s" = $1 WHERE id = $2`,
					tableName, columnName,
				)
				if _, err := tx.Exec(ctx, updateDestSQL, columnValue, rowIdentifier); err != nil {
					http.Error(w, "Failed to write destination column in copy: "+err.Error(), http.StatusInternalServerError)
					return
				}

			} else if !sourceIsColumn && !destIsColumn {
				// ---- Copy an entire row ----

				// 1) SELECT * from the source row
				selectSQL := fmt.Sprintf(`SELECT * FROM "%s" WHERE id = $1`, fromTable)
				rows, err := tx.Query(ctx, selectSQL, fromRowID)
				if err != nil {
					http.Error(w, "Failed to retrieve source row for copy: "+err.Error(), http.StatusInternalServerError)
					return
				}
				defer rows.Close()

				if !rows.Next() {
					http.Error(w, fmt.Sprintf("No row found with id=%v in table %s", fromRowID, fromTable), http.StatusNotFound)
					return
				}

				fieldDescriptions := rows.FieldDescriptions()
				values, err := rows.Values()
				if err != nil {
					http.Error(w, "Failed to read row data: "+err.Error(), http.StatusInternalServerError)
					return
				}

				rowData := make(map[string]interface{}, len(fieldDescriptions))
				for i, fd := range fieldDescriptions {
					colName := string(fd.Name)
					rowData[colName] = values[i]
				}

				// 2) INSERT the row into the destination table (source remains as-is)
				rowData["id"] = rowIdentifier // Reuse or set a new ID
				columns := make([]string, 0, len(rowData))
				placeholders := make([]string, 0, len(rowData))
				args := make([]interface{}, 0, len(rowData))

				i := 1
				for col, val := range rowData {
					columns = append(columns, fmt.Sprintf(`"%s"`, col))
					placeholders = append(placeholders, fmt.Sprintf("$%d", i))
					args = append(args, val)
					i++
				}

				insertSQL := fmt.Sprintf(
					`INSERT INTO "%s" (%s) VALUES (%s)`,
					tableName,
					strings.Join(columns, ", "),
					strings.Join(placeholders, ", "),
				)
				if _, err := tx.Exec(ctx, insertSQL, args...); err != nil {
					http.Error(w, "Failed to insert row into destination table in copy: "+err.Error(), http.StatusInternalServerError)
					return
				}

			} else {
				// Mismatched scenario: copying row -> single column or column -> entire row
				http.Error(w, "Unsupported copy: cannot copy row to a single column or vice versa", http.StatusBadRequest)
				return
			}

		default:
			http.Error(w, "Invalid operation type: "+op.Op, http.StatusBadRequest)
			return
		}

		// Commit the transaction if everything succeeded
		if err := tx.Commit(ctx); err != nil {
			http.Error(w, "Failed to commit transaction: "+err.Error(), http.StatusInternalServerError)
			return
		}
	}

	// Send a success response
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Patch operations applied successfully"))
}
