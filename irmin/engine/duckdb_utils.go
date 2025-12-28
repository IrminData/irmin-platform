package engine

import (
	"context"
	"database/sql"
	"fmt"
	"irmin-api/duckdb"
	"os"
	"path/filepath"
	"strings"

	irminutils "github.com/IrminData/irmin-sdk-go/utils"
)

// getReadOptions determines the appropriate DuckDB read options for the file format.
func (c *Client) getReadOptions(
	objectDetails *irminutils.ObjectDetails,
	originalFilePath string,
) (*duckdb.ReadOptions, error) {
	readOpts, err := duckdb.GetDuckDBReadOptions(objectDetails.ContentType)
	if err != nil {
		// Try fallback to file extension if MIME type fails
		return nil, fmt.Errorf(
			"unsupported format for %q (MIME: %s): %w",
			originalFilePath,
			objectDetails.ContentType,
			err,
		)
	}
	return readOpts, nil
}

// createTempInputFile creates a temporary file with the provided content.
func (c *Client) createTempInputFile(
	ctx context.Context,
	fileContent []byte,
	fileName string,
) (string, func(), error) {
	tempFile, err := os.CreateTemp("", "duckdb-input-*"+fileName)
	if err != nil {
		return "", nil, fmt.Errorf("failed to create temp input file: %w", err)
	}

	tempFilePath := tempFile.Name()

	cleanup := func() {
		if removeErr := os.Remove(tempFilePath); removeErr != nil {
			c.Logger.ErrorContext(ctx, "failed to remove temp input file", "error", removeErr)
		}
	}

	// Write content using the existing file handle
	if _, writeErr := tempFile.Write(fileContent); writeErr != nil {
		closeErr := tempFile.Close()
		if closeErr != nil {
			c.Logger.ErrorContext(ctx, "failed to close temp input file", "error", closeErr)
		}
		cleanup()
		return "", nil, fmt.Errorf("failed to write to temp input file: %w", writeErr)
	}

	// Close the file handle
	if closeErr := tempFile.Close(); closeErr != nil {
		cleanup()
		return "", nil, fmt.Errorf("failed to close temp input file: %w", closeErr)
	}

	return tempFilePath, cleanup, nil
}

// getFileSchema retrieves the column names from the file using DuckDB DESCRIBE.
func (c *Client) getFileSchema(
	ctx context.Context,
	duckDBClient *duckdb.QueryClient,
	tempInputPath string,
	readOpts *duckdb.ReadOptions,
	originalFilePath string,
) ([]string, error) {
	readQueryPart := duckdb.BuildReadQuery(tempInputPath, readOpts)
	describeQuery := fmt.Sprintf("DESCRIBE SELECT * FROM %s;", readQueryPart)

	rows, err := duckDBClient.ExecuteQuery(ctx, describeQuery)
	if err != nil {
		return nil, fmt.Errorf("failed to describe schema for %s: %w", originalFilePath, err)
	}
	defer rows.Close()

	var columnNames []string
	for rows.Next() {
		var colName, colType, null, key, defaultValue, extra sql.NullString
		if scanErr := rows.Scan(&colName, &colType, &null, &key, &defaultValue, &extra); scanErr != nil {
			return nil, fmt.Errorf("failed to scan schema row for %s: %w", originalFilePath, scanErr)
		}
		if colName.Valid && colName.String != "" {
			columnNames = append(columnNames, colName.String)
		}
	}

	if rowErr := rows.Err(); rowErr != nil {
		return nil, fmt.Errorf("error iterating rows for %s: %w", originalFilePath, rowErr)
	}

	if len(columnNames) == 0 {
		return nil, fmt.Errorf("no columns found in file %s", originalFilePath)
	}

	return columnNames, nil
}

// quoteIdentifier safely quotes a SQL identifier by escaping embedded double quotes.
// This prevents SQL injection when using user-provided strings as column names.
func quoteIdentifier(s string) string {
	return fmt.Sprintf(`"%s"`, strings.ReplaceAll(s, `"`, `""`))
}

// executeTransformation performs the actual data transformation using DuckDB.
func (c *Client) executeTransformation(
	ctx context.Context,
	duckDBClient *duckdb.QueryClient,
	tempInputPath string,
	inputReadOpts *duckdb.ReadOptions,
	outputReadOpts *duckdb.ReadOptions,
	selectClause string,
	fileName string,
) ([]byte, error) {
	// Create temporary output file
	tempOutputFile, err := os.CreateTemp("", "duckdb-output-*"+fileName)
	if err != nil {
		return nil, fmt.Errorf("failed to create temp output file: %w", err)
	}
	tempOutputPath := tempOutputFile.Name()
	if closeErr := tempOutputFile.Close(); closeErr != nil {
		c.Logger.ErrorContext(ctx, "failed to close temp output file", "error", closeErr)
	}
	defer func() {
		if removeErr := os.Remove(tempOutputPath); removeErr != nil {
			c.Logger.ErrorContext(ctx, "failed to remove temp output file", "error", removeErr)
		}
	}()

	// Build and execute the transformation query
	readQueryPart := duckdb.BuildReadQuery(tempInputPath, inputReadOpts)
	copyQuery := c.buildCopyQuery(selectClause, readQueryPart, tempOutputPath, outputReadOpts)

	if _, execErr := duckDBClient.ExecuteNonQuery(ctx, copyQuery); execErr != nil {
		return nil, fmt.Errorf("failed to execute transformation query: %w", execErr)
	}

	// Read and return the transformed data
	transformedData, readErr := os.ReadFile(tempOutputPath)
	if readErr != nil {
		return nil, fmt.Errorf("failed to read transformed data: %w", readErr)
	}

	return transformedData, nil
}

// buildCopyQuery creates the appropriate COPY query based on the destination format.
func (c *Client) buildCopyQuery(
	selectClause, readQueryPart, tempOutputPath string,
	outputReadOpts *duckdb.ReadOptions,
) string {
	switch {
	case strings.HasPrefix(outputReadOpts.FormatOption, "CSV"):
		// Extract delimiter from read options
		delimiter := "," // Default to comma
		if delimParam, exists := outputReadOpts.Parameters["delim"]; exists {
			// Use delimiter from parameters (e.g., "\\t" for TSV)
			delimiter = delimParam
		} else if strings.Contains(outputReadOpts.FormatOption, "DELIMITER") {
			// Extract delimiter from FormatOption string (e.g., "CSV (HEADER, DELIMITER '\t')")
			if strings.Contains(outputReadOpts.FormatOption, "DELIMITER '\\t'") {
				delimiter = "\\t"
			} else if strings.Contains(outputReadOpts.FormatOption, "DELIMITER ','") {
				delimiter = ","
			}
		}

		return fmt.Sprintf(
			`COPY (SELECT %s FROM %s) TO '%s' (FORMAT CSV, HEADER, DELIMITER '%s');`,
			selectClause,
			readQueryPart,
			tempOutputPath,
			delimiter,
		)
	case strings.HasPrefix(outputReadOpts.FormatOption, "JSON"):
		return fmt.Sprintf(
			`COPY (SELECT %s FROM %s) TO '%s' (FORMAT JSON);`,
			selectClause,
			readQueryPart,
			tempOutputPath,
		)
	case strings.HasPrefix(outputReadOpts.FormatOption, "PARQUET"):
		return fmt.Sprintf(
			`COPY (SELECT %s FROM %s) TO '%s' (FORMAT PARQUET);`,
			selectClause,
			readQueryPart,
			tempOutputPath,
		)
	default:
		// For other formats, use the base format name
		formatName := strings.Split(outputReadOpts.FormatOption, " ")[0]
		return fmt.Sprintf(
			`COPY (SELECT %s FROM %s) TO '%s' (FORMAT %s);`,
			selectClause,
			readQueryPart,
			tempOutputPath,
			formatName,
		)
	}
}

// changeFileExtension changes the extension of a filename.
func changeFileExtension(fileName string, newExt string) string {
	ext := filepath.Ext(fileName)
	if ext == "" {
		return fileName + newExt
	}
	return fileName[:len(fileName)-len(ext)] + newExt
}
