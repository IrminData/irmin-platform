package duckdb

import (
	"database/sql"
	"errors"
	"fmt"
	"os"
	"strings"

	irminutils "github.com/IrminData/irmin-sdk-go/utils"
)

// MergeStrategy defines how to handle conflicts when merging data.
type MergeStrategy string

const (
	// MergeStrategyUnion combines all rows from all sources (allows duplicates).
	MergeStrategyUnion MergeStrategy = "union"

	// MergeStrategyUnionDistinct combines all rows but removes exact duplicates.
	MergeStrategyUnionDistinct MergeStrategy = "union_distinct"

	// MergeStrategyFirstWins keeps only rows from the first source when conflicts occur.
	MergeStrategyFirstWins MergeStrategy = "first_wins"

	// MergeStrategyLastWins keeps only rows from the last source when conflicts occur.
	MergeStrategyLastWins MergeStrategy = "last_wins"
)

// MergeFileResult represents the result of merging multiple source files.
type MergeFileResult struct {
	DestinationPath string   `json:"destination_path"`
	Content         []byte   `json:"content"`
	SourcePaths     []string `json:"source_paths"` // Track which sources contributed
}

// MergeFiles merges multiple source files that map to the same destination path.
// It handles schema alignment, data type conflicts, and different merge strategies.
//
// Parameters:
//   - duckDBClient: DuckDB client for executing queries
//   - sourceFiles: Map of source file paths to their content
//   - destinationPath: The target destination path where merged data should go
//   - strategy: How to handle merge conflicts
//
// Returns the merged file content or an error.
func (c *QueryClient) MergeFiles(
	sourceFiles map[string][]byte,
	destinationPath string,
	strategy MergeStrategy,
) (*MergeFileResult, error) {
	if len(sourceFiles) == 0 {
		return nil, errors.New("no source files provided for merging")
	}

	// Get destination format from the destination path - check this early
	destObjectDetails := irminutils.ParseObjectDetailsFromPath(destinationPath)
	destReadOpts, err := GetDuckDBReadOptions(destObjectDetails.ContentType)
	if err != nil {
		return nil, fmt.Errorf("unsupported destination format for %q: %w", destinationPath, err)
	}

	// If only one source file, return it directly (but we've already validated the destination format)
	if len(sourceFiles) == 1 {
		for sourcePath, content := range sourceFiles {
			return &MergeFileResult{
				DestinationPath: destinationPath,
				Content:         content,
				SourcePaths:     []string{sourcePath},
			}, nil
		}
	}

	// Create temporary files for each source
	tempFiles, cleanup, err := c.createTempSourceFiles(sourceFiles)
	if err != nil {
		return nil, fmt.Errorf("failed to create temporary source files: %w", err)
	}
	defer cleanup()

	// Analyze schemas and build union schema
	unionSchema, err := c.buildUnionSchema(tempFiles)
	if err != nil {
		return nil, fmt.Errorf("failed to build union schema: %w", err)
	}

	// Execute merge query
	mergedContent, err := c.executeMergeQuery(
		tempFiles,
		unionSchema,
		destReadOpts,
		destObjectDetails.Name,
		strategy,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to execute merge query: %w", err)
	}

	// Collect source paths
	sourcePaths := make([]string, 0, len(sourceFiles))
	for sourcePath := range sourceFiles {
		sourcePaths = append(sourcePaths, sourcePath)
	}

	return &MergeFileResult{
		DestinationPath: destinationPath,
		Content:         mergedContent,
		SourcePaths:     sourcePaths,
	}, nil
}

// createTempSourceFiles creates temporary files for all source files.
func (c *QueryClient) createTempSourceFiles(sourceFiles map[string][]byte) (map[string]string, func(), error) {
	tempFiles := make(map[string]string)
	var cleanupFuncs []func()

	cleanup := func() {
		for _, cleanupFunc := range cleanupFuncs {
			cleanupFunc()
		}
	}

	for sourcePath, content := range sourceFiles {
		tempPath, cleanupFunc, err := c.createSingleTempFile(sourcePath, content)
		if err != nil {
			cleanup()
			return nil, nil, err
		}

		tempFiles[sourcePath] = tempPath
		cleanupFuncs = append(cleanupFuncs, cleanupFunc)
	}

	return tempFiles, cleanup, nil
}

// createSingleTempFile creates a single temporary file for the given source.
func (c *QueryClient) createSingleTempFile(sourcePath string, content []byte) (string, func(), error) {
	objectDetails := irminutils.ParseObjectDetailsFromPath(sourcePath)

	tempFile, createTempFileErr := os.CreateTemp("", "duckdb-merge-*"+objectDetails.Name)
	if createTempFileErr != nil {
		return "", nil, fmt.Errorf("failed to create temp file for %s: %w", sourcePath, createTempFileErr)
	}

	tempPath := tempFile.Name()
	cleanup := func() {
		if removeTempPathErr := os.Remove(tempPath); removeTempPathErr != nil {
			c.logger.Error("failed to remove temp file", "error", removeTempPathErr)
		}
	}

	if writeAndCloseErr := c.writeAndCloseTempFile(tempFile, content, sourcePath); writeAndCloseErr != nil {
		cleanup()
		return "", nil, writeAndCloseErr
	}

	return tempPath, cleanup, nil
}

// writeAndCloseTempFile writes content to temp file and closes it properly.
func (c *QueryClient) writeAndCloseTempFile(tempFile *os.File, content []byte, sourcePath string) error {
	// Write content using the existing file handle
	if _, err := tempFile.Write(content); err != nil {
		closeErr := tempFile.Close()
		if closeErr != nil {
			c.logger.Error("failed to close temp file", "error", closeErr)
		}
		return fmt.Errorf("failed to write temp file for %s: %w", sourcePath, err)
	}

	// Close the file handle
	if closeErr := tempFile.Close(); closeErr != nil {
		c.logger.Error("failed to close temp file", "error", closeErr)
		return fmt.Errorf("failed to close temp file for %s: %w", sourcePath, closeErr)
	}

	return nil
}

// ColumnSchema represents the schema of a single column.
type ColumnSchema struct {
	Name string
	Type string
}

// analyzeFileSchema analyzes a single file's schema and returns column information.
func (c *QueryClient) analyzeFileSchema(sourcePath, tempPath string) ([]ColumnSchema, error) {
	objectDetails := irminutils.ParseObjectDetailsFromPath(sourcePath)
	readOpts, err := GetDuckDBReadOptions(objectDetails.ContentType)
	if err != nil {
		return nil, fmt.Errorf("failed to get read options for %s: %w", sourcePath, err)
	}

	// Get schema for this file
	readQueryPart := BuildReadQuery(tempPath, readOpts)
	describeQuery := fmt.Sprintf("DESCRIBE SELECT * FROM %s;", readQueryPart)

	rows, err := c.ExecuteQuery(describeQuery)
	if err != nil {
		return nil, fmt.Errorf("failed to describe schema for %s: %w", sourcePath, err)
	}
	defer rows.Close()

	var columns []ColumnSchema
	for rows.Next() {
		var colName, colType, null, key, defaultValue, extra sql.NullString
		if scanErr := rows.Scan(&colName, &colType, &null, &key, &defaultValue, &extra); scanErr != nil {
			return nil, fmt.Errorf("failed to scan schema row for %s: %w", sourcePath, scanErr)
		}

		if colName.Valid && colName.String != "" {
			columns = append(columns, ColumnSchema{
				Name: colName.String,
				Type: colType.String,
			})
		}
	}

	if rowErr := rows.Err(); rowErr != nil {
		return nil, fmt.Errorf("error iterating rows for %s: %w", sourcePath, rowErr)
	}

	return columns, nil
}

// mergeColumnSchemas merges column schemas from multiple files, handling type conflicts.
func mergeColumnSchemas(allFileSchemas map[string][]ColumnSchema) []ColumnSchema {
	allColumns := make(map[string]map[string]bool) // column_name -> {type1: true, type2: true}
	columnOrder := make(map[string]int)
	maxOrder := 0

	// Collect all columns and their types from all files
	for _, fileSchema := range allFileSchemas {
		for order, column := range fileSchema {
			// Track column types
			if allColumns[column.Name] == nil {
				allColumns[column.Name] = make(map[string]bool)
			}
			allColumns[column.Name][column.Type] = true

			// Track column order (first occurrence wins)
			if _, exists := columnOrder[column.Name]; !exists {
				columnOrder[column.Name] = maxOrder + order
			}
		}
		maxOrder += len(fileSchema)
	}

	// Build unified schema with conflict resolution
	schema := make([]ColumnSchema, 0, len(allColumns))
	for colName, types := range allColumns {
		// Resolve type conflicts by choosing the most compatible type
		resolvedType := resolveTypeConflict(types)
		schema = append(schema, ColumnSchema{
			Name: colName,
			Type: resolvedType,
		})
	}

	// Sort by column order
	for i := 0; i < len(schema); i++ {
		for j := i + 1; j < len(schema); j++ {
			if columnOrder[schema[i].Name] > columnOrder[schema[j].Name] {
				schema[i], schema[j] = schema[j], schema[i]
			}
		}
	}

	return schema
}

// buildUnionSchema analyzes all source files and creates a unified schema.
func (c *QueryClient) buildUnionSchema(tempFiles map[string]string) ([]ColumnSchema, error) {
	allFileSchemas := make(map[string][]ColumnSchema)

	// Analyze each source file's schema
	for sourcePath, tempPath := range tempFiles {
		fileSchema, err := c.analyzeFileSchema(sourcePath, tempPath)
		if err != nil {
			return nil, err
		}
		allFileSchemas[sourcePath] = fileSchema
	}

	// Merge all schemas with conflict resolution
	return mergeColumnSchemas(allFileSchemas), nil
}

// resolveTypeConflict chooses the most compatible type when columns have different types.
func resolveTypeConflict(types map[string]bool) string {
	if len(types) == 1 {
		for t := range types {
			return t
		}
	}

	// Type compatibility hierarchy (most to least compatible)
	typeHierarchy := []string{
		"VARCHAR", "TEXT", "STRING", // Most compatible - can hold anything
		"DOUBLE", "FLOAT", "REAL", // Numeric with decimals
		"BIGINT", "INTEGER", "INT", // Integers
		"BOOLEAN", // Least compatible
	}

	// Find the most compatible type that exists in our types
	for _, compatibleType := range typeHierarchy {
		for t := range types {
			if strings.Contains(strings.ToUpper(t), compatibleType) {
				return compatibleType
			}
		}
	}

	// Fallback to VARCHAR if no match found
	return "VARCHAR"
}

// executeMergeQuery performs the actual merge operation using DuckDB.
func (c *QueryClient) executeMergeQuery(
	tempFiles map[string]string,
	schema []ColumnSchema,
	destReadOpts *ReadOptions,
	fileName string,
	strategy MergeStrategy,
) ([]byte, error) {
	// Build individual SELECT queries for each source file
	selectQueries, err := c.buildSelectQueries(tempFiles, schema)
	if err != nil {
		return nil, err
	}

	// Combine queries based on strategy
	finalQuery := c.combineQueriesWithStrategy(selectQueries, strategy)

	// Create temporary output file
	tempOutputPath, cleanup, err := c.createTempOutputFile(fileName)
	if err != nil {
		return nil, err
	}
	defer cleanup()

	// Build and execute the copy query
	copyQuery := c.buildCopyQuery(finalQuery, tempOutputPath, destReadOpts)
	if _, execErr := c.ExecuteNonQuery(copyQuery); execErr != nil {
		return nil, fmt.Errorf("failed to execute merge query: %w", execErr)
	}

	// Read and return the merged data
	mergedData, readErr := os.ReadFile(tempOutputPath)
	if readErr != nil {
		return nil, fmt.Errorf("failed to read merged data: %w", readErr)
	}

	return mergedData, nil
}

// buildSelectQueries creates SELECT queries for each source file with schema alignment.
func (c *QueryClient) buildSelectQueries(tempFiles map[string]string, schema []ColumnSchema) ([]string, error) {
	var selectQueries []string

	for sourcePath, tempPath := range tempFiles {
		objectDetails := irminutils.ParseObjectDetailsFromPath(sourcePath)
		readOpts, err := GetDuckDBReadOptions(objectDetails.ContentType)
		if err != nil {
			return nil, fmt.Errorf("failed to get read options for %s: %w", sourcePath, err)
		}

		readQueryPart := BuildReadQuery(tempPath, readOpts)

		// Get the actual schema of this specific file
		fileSchema, err := c.analyzeFileSchema(sourcePath, tempPath)
		if err != nil {
			return nil, fmt.Errorf("failed to analyze schema for %s: %w", sourcePath, err)
		}

		// Create a map of existing columns for quick lookup
		existingColumns := make(map[string]bool)
		for _, col := range fileSchema {
			existingColumns[col.Name] = true
		}

		// Build SELECT with schema alignment
		selectColumns := c.buildSelectColumns(schema, existingColumns)
		selectQuery := fmt.Sprintf("SELECT %s FROM %s",
			strings.Join(selectColumns, ", "), readQueryPart)
		selectQueries = append(selectQueries, selectQuery)
	}

	return selectQueries, nil
}

// buildSelectColumns creates the column list for SELECT queries with proper casting and NULL handling.
func (c *QueryClient) buildSelectColumns(schema []ColumnSchema, existingColumns map[string]bool) []string {
	var selectColumns []string
	for _, col := range schema {
		if existingColumns[col.Name] {
			// Column exists, cast it to the unified type
			selectColumns = append(selectColumns,
				fmt.Sprintf(`CAST("%s" AS %s) AS "%s"`, col.Name, col.Type, col.Name))
		} else {
			// Column doesn't exist, use NULL with proper type
			selectColumns = append(selectColumns,
				fmt.Sprintf(`CAST(NULL AS %s) AS "%s"`, col.Type, col.Name))
		}
	}
	return selectColumns
}

// combineQueriesWithStrategy combines SELECT queries based on the merge strategy.
func (c *QueryClient) combineQueriesWithStrategy(selectQueries []string, strategy MergeStrategy) string {
	switch strategy {
	case MergeStrategyUnion:
		return strings.Join(selectQueries, " UNION ALL ")
	case MergeStrategyUnionDistinct:
		return strings.Join(selectQueries, " UNION ")
	case MergeStrategyFirstWins:
		if len(selectQueries) > 0 {
			finalQuery := selectQueries[0]
			if len(selectQueries) > 1 {
				finalQuery += " UNION ALL " + strings.Join(selectQueries[1:], " UNION ALL ")
				finalQuery = fmt.Sprintf("SELECT DISTINCT * FROM (%s)", finalQuery)
			}
			return finalQuery
		}
		return ""
	case MergeStrategyLastWins:
		reversed := make([]string, len(selectQueries))
		for i, query := range selectQueries {
			reversed[len(selectQueries)-1-i] = query
		}
		finalQuery := strings.Join(reversed, " UNION ALL ")
		return fmt.Sprintf("SELECT DISTINCT * FROM (%s)", finalQuery)
	default:
		return strings.Join(selectQueries, " UNION ALL ")
	}
}

// createTempOutputFile creates a temporary output file and returns the path and cleanup function.
func (c *QueryClient) createTempOutputFile(fileName string) (string, func(), error) {
	tempOutputFile, err := os.CreateTemp("", "duckdb-merge-output-*"+fileName)
	if err != nil {
		return "", nil, fmt.Errorf("failed to create temp output file: %w", err)
	}

	tempOutputPath := tempOutputFile.Name()
	if closeErr := tempOutputFile.Close(); closeErr != nil {
		return "", nil, fmt.Errorf("failed to close temp output file: %w", closeErr)
	}

	cleanup := func() {
		if removeTempOutputPathErr := os.Remove(tempOutputPath); removeTempOutputPathErr != nil {
			c.logger.Error("failed to remove temp output file", "error", removeTempOutputPathErr)
		}
	}

	return tempOutputPath, cleanup, nil
}

// buildCopyQuery creates the appropriate COPY query based on the destination format.
func (c *QueryClient) buildCopyQuery(finalQuery, tempOutputPath string, destReadOpts *ReadOptions) string {
	switch {
	case strings.HasPrefix(destReadOpts.FormatOption, "CSV"):
		// Extract delimiter from read options
		delimiter := "," // Default to comma
		if delimParam, exists := destReadOpts.Parameters["delim"]; exists {
			// Use delimiter from parameters (e.g., "\\t" for TSV)
			delimiter = delimParam
		} else if strings.Contains(destReadOpts.FormatOption, "DELIMITER") {
			// Extract delimiter from FormatOption string (e.g., "CSV (HEADER, DELIMITER '\t')")
			if strings.Contains(destReadOpts.FormatOption, "DELIMITER '\\t'") {
				delimiter = "\\t"
			} else if strings.Contains(destReadOpts.FormatOption, "DELIMITER ','") {
				delimiter = ","
			}
		}

		return fmt.Sprintf(
			`COPY (%s) TO '%s' (FORMAT CSV, HEADER, DELIMITER '%s');`,
			finalQuery,
			tempOutputPath,
			delimiter,
		)
	case strings.HasPrefix(destReadOpts.FormatOption, "JSON"):
		return fmt.Sprintf(
			`COPY (%s) TO '%s' (FORMAT JSON);`,
			finalQuery,
			tempOutputPath,
		)
	case strings.HasPrefix(destReadOpts.FormatOption, "PARQUET"):
		return fmt.Sprintf(
			`COPY (%s) TO '%s' (FORMAT PARQUET);`,
			finalQuery,
			tempOutputPath,
		)
	default:
		return fmt.Sprintf(
			`COPY (%s) TO '%s' (FORMAT %s);`,
			finalQuery,
			tempOutputPath,
			destReadOpts.FormatOption,
		)
	}
}
