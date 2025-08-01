package duckdb

import (
	"errors"
	"fmt"
	"os"
	"strings"
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

	// decrementStep is used when iterating backwards through source table names.
	decrementStep = 2
)

// MergeResult represents the result of merging multiple data sources.
type MergeResult struct {
	TableName   string   `json:"table_name"`
	RowCount    int      `json:"row_count"`
	SourceNames []string `json:"source_names"` // Track which sources contributed
}

// MergeDataSources merges multiple in-memory data sources into a single table.
// It handles different merge strategies for conflict resolution.
//
// Parameters:
//   - dataSources: Map of source names to their data
//   - targetTableName: The name of the target table to create
//   - strategy: How to handle merge conflicts
//
// Returns the merge result or an error.
func (c *InMemoryClient) MergeDataSources(
	dataSources map[string][]map[string]any,
	targetTableName string,
	strategy MergeStrategy,
) (*MergeResult, error) {
	if len(dataSources) == 0 {
		return nil, errors.New("no data sources provided for merging")
	}

	// If only one source, create table directly
	if len(dataSources) == 1 {
		for sourceName, data := range dataSources {
			if err := c.CreateTableFromData(targetTableName, data); err != nil {
				return nil, fmt.Errorf("failed to create table from single source: %w", err)
			}
			return &MergeResult{
				TableName:   targetTableName,
				RowCount:    len(data),
				SourceNames: []string{sourceName},
			}, nil
		}
	}

	// Create individual tables for each source
	var tempTableNames []string
	var sourceNames []string
	totalRows := 0

	for sourceName, data := range dataSources {
		tempTableName := fmt.Sprintf("temp_%s_%s", targetTableName, CleanTableName(sourceName))
		tempTableNames = append(tempTableNames, tempTableName)
		sourceNames = append(sourceNames, sourceName)
		totalRows += len(data)

		if err := c.CreateTableFromData(tempTableName, data); err != nil {
			return nil, fmt.Errorf("failed to create temp table for source %s: %w", sourceName, err)
		}
	}

	// Build merge query based on strategy
	mergeQuery, err := c.buildMergeQuery(tempTableNames, targetTableName, strategy)
	if err != nil {
		return nil, fmt.Errorf("failed to build merge query: %w", err)
	}

	// Execute merge query
	if _, execErr := c.db.Exec(mergeQuery); execErr != nil {
		return nil, fmt.Errorf("failed to execute merge query: %w", execErr)
	}

	// Get actual row count from merged table
	var finalRowCount int
	countQuery, queryErr := buildCountQuery(targetTableName)
	if queryErr != nil {
		c.logger.Warn("invalid target table name for count query", "table", targetTableName, "error", queryErr)
		finalRowCount = totalRows // fallback
	} else {
		if scanErr := c.db.QueryRow(countQuery).Scan(&finalRowCount); scanErr != nil {
			finalRowCount = totalRows // fallback
		}
	}

	// Clean up temporary tables
	c.cleanupTempTables(tempTableNames)

	return &MergeResult{
		TableName:   targetTableName,
		RowCount:    finalRowCount,
		SourceNames: sourceNames,
	}, nil
}

// MergeFiles merges multiple files from byte content into a single table.
// This is useful for processing files loaded into memory.
func (c *InMemoryClient) MergeFiles(
	sourceFiles map[string][]byte,
	targetTableName string,
	strategy MergeStrategy,
) (*MergeResult, error) {
	if len(sourceFiles) == 0 {
		return nil, errors.New("no source files provided for merging")
	}

	// Process files and create temporary tables
	tempTableNames, sourceNames, cleanup, err := c.processFilesForMerge(sourceFiles, targetTableName)
	if err != nil {
		return nil, err
	}

	defer func() {
		for _, cleanupFunc := range cleanup {
			cleanupFunc()
		}
	}()

	// Execute merge operation
	return c.executeMergeOperation(tempTableNames, sourceNames, targetTableName, strategy)
}

// processFilesForMerge handles the creation of temporary files and tables from source files.
func (c *InMemoryClient) processFilesForMerge(
	sourceFiles map[string][]byte,
	targetTableName string,
) ([]string, []string, []func(), error) {
	var tempTableNames []string
	var sourceNames []string
	var cleanup []func()

	for filename, content := range sourceFiles {
		tempFile, createTempErr := os.CreateTemp("", fmt.Sprintf("duckdb_merge_*_%s", CleanTableName(filename)))
		if createTempErr != nil {
			return nil, nil, cleanup, fmt.Errorf("failed to create temp file for %s: %w", filename, createTempErr)
		}

		tempFilePath := tempFile.Name()
		cleanup = append(cleanup, func() {
			if removeErr := os.Remove(tempFilePath); removeErr != nil {
				// Cleanup errors are not critical, so we just ignore them
				_ = removeErr
			}
		})

		var writeErr error
		if writeErr = c.writeAndCloseFile(tempFile, content); writeErr != nil {
			return nil, nil, cleanup, writeErr
		}

		tempTableName := fmt.Sprintf("temp_%s_%s", targetTableName, CleanTableName(filename))
		tempTableNames = append(tempTableNames, tempTableName)
		sourceNames = append(sourceNames, filename)

		var loadErr error
		if loadErr = c.loadFileAsTableFromPath(tempFilePath, filename, tempTableName); loadErr != nil {
			return nil, nil, cleanup, fmt.Errorf("failed to load file %s as table: %w", filename, loadErr)
		}
	}

	return tempTableNames, sourceNames, cleanup, nil
}

// writeAndCloseFile writes content to a temp file and closes it safely.
func (c *InMemoryClient) writeAndCloseFile(tempFile *os.File, content []byte) error {
	if _, writeErr := tempFile.Write(content); writeErr != nil {
		if closeErr := tempFile.Close(); closeErr != nil {
			// Close error is secondary to write error, so we ignore it
			_ = closeErr
		}
		return fmt.Errorf("failed to write content to temp file: %w", writeErr)
	}
	if closeErr := tempFile.Close(); closeErr != nil {
		return fmt.Errorf("failed to close temp file: %w", closeErr)
	}
	return nil
}

// executeMergeOperation performs the actual merge operation and cleanup.
func (c *InMemoryClient) executeMergeOperation(
	tempTableNames, sourceNames []string,
	targetTableName string,
	strategy MergeStrategy,
) (*MergeResult, error) {
	// Build and execute merge query
	mergeQuery, err := c.buildMergeQuery(tempTableNames, targetTableName, strategy)
	if err != nil {
		return nil, fmt.Errorf("failed to build merge query: %w", err)
	}

	if _, execErr := c.db.Exec(mergeQuery); execErr != nil {
		return nil, fmt.Errorf("failed to execute merge query: %w", execErr)
	}

	// Get row count
	var finalRowCount int
	countQuery, queryErr := buildCountQuery(targetTableName)
	if queryErr != nil {
		c.logger.Warn("invalid target table name for count query", "table", targetTableName, "error", queryErr)
	} else {
		if scanErr := c.db.QueryRow(countQuery).Scan(&finalRowCount); scanErr != nil {
			c.logger.Warn("failed to get row count", "error", scanErr)
		}
	}

	// Clean up temporary tables
	c.cleanupTempTables(tempTableNames)

	return &MergeResult{
		TableName:   targetTableName,
		RowCount:    finalRowCount,
		SourceNames: sourceNames,
	}, nil
}

// cleanupTempTables removes temporary tables from the database.
func (c *InMemoryClient) cleanupTempTables(tempTableNames []string) {
	for _, tempTable := range tempTableNames {
		dropQuery := fmt.Sprintf("DROP TABLE IF EXISTS %s", tempTable)
		if _, dropErr := c.db.Exec(dropQuery); dropErr != nil {
			c.logger.Warn("failed to drop temporary table", "table", tempTable, "error", dropErr)
		}
	}
}

// loadFileAsTable overloaded version that accepts byte data.
func (c *InMemoryClient) loadFileAsTable(data []byte, originalFilename, tableName string) error {
	// Validate format is supported before proceeding
	if !IsFormatSupported(originalFilename) {
		return fmt.Errorf("unsupported format for %s", originalFilename)
	}

	// Create temporary file from byte data
	tempFile, err := os.CreateTemp("", fmt.Sprintf("duckdb_load_*_%s", CleanTableName(originalFilename)))
	if err != nil {
		return fmt.Errorf("failed to create temp file for %s: %w", originalFilename, err)
	}
	defer os.Remove(tempFile.Name())
	defer tempFile.Close()

	// Write byte data to temp file
	if _, writeErr := tempFile.Write(data); writeErr != nil {
		return fmt.Errorf("failed to write data to temp file: %w", writeErr)
	}
	if closeErr := tempFile.Close(); closeErr != nil {
		return fmt.Errorf("failed to close temp file before reading: %w", closeErr)
	}

	// Create table from file using the file path version
	return c.loadFileAsTableFromPath(tempFile.Name(), originalFilename, tableName)
}

// loadFileAsTableFromPath loads a file from a file path into DuckDB as a table.
func (c *InMemoryClient) loadFileAsTableFromPath(filePath, originalFilename, tableName string) error {
	options, err := GetDuckDBReadOptions(originalFilename)
	if err != nil {
		return fmt.Errorf("unsupported format for %s: %w", originalFilename, err)
	}

	// Install required extensions
	for _, ext := range GetRequiredExtensions(options) {
		installQuery := fmt.Sprintf("INSTALL %s;", ext)
		loadQuery := fmt.Sprintf("LOAD %s;", ext)

		if _, installErr := c.db.Exec(installQuery); installErr != nil {
			c.logger.Warn("failed to install extension", "extension", ext, "error", installErr)
		}
		if _, loadErr := c.db.Exec(loadQuery); loadErr != nil {
			c.logger.Warn("failed to load extension", "extension", ext, "error", loadErr)
		}
	}

	// Create table from file
	readQuery, readErr := BuildReadQuery(filePath, options)
	if readErr != nil {
		return fmt.Errorf("failed to build read query: %w", readErr)
	}
	fromClause := "SELECT * FROM " + readQuery
	createQuery, queryErr := buildCreateTableQuery(tableName, fromClause)
	if queryErr != nil {
		return fmt.Errorf("invalid table name: %w", queryErr)
	}

	if _, createErr := c.db.Exec(createQuery); createErr != nil {
		return fmt.Errorf("failed to create table %s from file: %w", tableName, createErr)
	}

	return nil
}

// buildMergeQuery constructs the appropriate merge query based on strategy.
func (c *InMemoryClient) buildMergeQuery(
	sourceTableNames []string,
	targetTableName string,
	strategy MergeStrategy,
) (string, error) {
	if len(sourceTableNames) == 0 {
		return "", errors.New("no source tables provided")
	}

	// Validate and quote target table name to prevent SQL injection
	validatedTargetTable, err := validateSQLIdentifierForMerge(targetTableName)
	if err != nil {
		return "", fmt.Errorf("invalid target table name: %w", err)
	}

	// Validate and quote all source table names to prevent SQL injection
	var validatedSourceTables []string
	for _, tableName := range sourceTableNames {
		validatedTable, validateSQLIdentifierForMergeErr := validateSQLIdentifierForMerge(tableName)
		if validateSQLIdentifierForMergeErr != nil {
			return "", fmt.Errorf("invalid source table name '%s': %w", tableName, validateSQLIdentifierForMergeErr)
		}
		validatedSourceTables = append(validatedSourceTables, validatedTable)
	}

	var selectQueries []string
	for _, validatedTableName := range validatedSourceTables {
		selectQueries = append(selectQueries, fmt.Sprintf("SELECT * FROM %s", validatedTableName))
	}

	switch strategy {
	case MergeStrategyUnion:
		query := fmt.Sprintf("CREATE TABLE %s AS (%s)",
			validatedTargetTable,
			strings.Join(selectQueries, " UNION ALL "))
		return query, nil

	case MergeStrategyUnionDistinct:
		query := fmt.Sprintf("CREATE TABLE %s AS (%s)",
			validatedTargetTable,
			strings.Join(selectQueries, " UNION "))
		return query, nil

	case MergeStrategyFirstWins:
		// For first wins, we take the first table and use EXCEPT to remove duplicates from others
		if len(validatedSourceTables) == 1 {
			return fmt.Sprintf(
				"CREATE TABLE %s AS SELECT * FROM %s",
				validatedTargetTable,
				validatedSourceTables[0],
			), nil
		}

		baseQuery := fmt.Sprintf("SELECT * FROM %s", validatedSourceTables[0])
		for i := 1; i < len(validatedSourceTables); i++ {
			baseQuery = fmt.Sprintf("(%s) UNION (SELECT * FROM %s EXCEPT %s)",
				baseQuery, validatedSourceTables[i], baseQuery)
		}
		return fmt.Sprintf("CREATE TABLE %s AS %s", validatedTargetTable, baseQuery), nil

	case MergeStrategyLastWins:
		// For last wins, we reverse the order and apply first wins logic
		if len(validatedSourceTables) == 1 {
			return fmt.Sprintf(
				"CREATE TABLE %s AS SELECT * FROM %s",
				validatedTargetTable,
				validatedSourceTables[0],
			), nil
		}

		baseQuery := fmt.Sprintf("SELECT * FROM %s", validatedSourceTables[len(validatedSourceTables)-1])
		for i := len(validatedSourceTables) - decrementStep; i >= 0; i-- {
			baseQuery = fmt.Sprintf("(%s) UNION (SELECT * FROM %s EXCEPT %s)",
				baseQuery, validatedSourceTables[i], baseQuery)
		}
		return fmt.Sprintf("CREATE TABLE %s AS %s", validatedTargetTable, baseQuery), nil

	default:
		return "", fmt.Errorf("unsupported merge strategy: %s", strategy)
	}
}

// CleanTableName removes special characters from table names to make them valid SQL identifiers.
// Ensures the resulting name starts with a letter or underscore and contains only valid characters.
func CleanTableName(name string) string {
	// Remove file extensions first (before replacing dots)
	if idx := strings.LastIndex(name, "."); idx != -1 {
		name = name[:idx]
	}

	// Replace common problematic characters
	name = strings.ReplaceAll(name, ".", "_")
	name = strings.ReplaceAll(name, "-", "_")
	name = strings.ReplaceAll(name, " ", "_")
	name = strings.ReplaceAll(name, "/", "_")
	name = strings.ReplaceAll(name, "\\", "_")

	// Remove any remaining invalid characters (keep only alphanumeric and underscore)
	var cleaned strings.Builder
	for _, char := range name {
		if (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') ||
			(char >= '0' && char <= '9') || char == '_' {
			cleaned.WriteRune(char)
		}
	}
	name = cleaned.String()

	// Handle empty result or result that would be invalid
	if name == "" {
		return "table_default"
	}

	// Ensure the name starts with a letter or underscore (SQL identifier requirement)
	if name[0] >= '0' && name[0] <= '9' {
		return "table_" + name
	}

	return name
}

// validateSQLIdentifierForMerge validates and safely quotes SQL identifiers for merge operations.
// This helps prevent SQL injection by ensuring only valid identifiers are used.
func validateSQLIdentifierForMerge(identifier string) (string, error) {
	return ValidateSQLIdentifier(identifier)
}

// buildCountQuery safely constructs a COUNT query for a table.
func buildCountQuery(tableName string) (string, error) {
	safeTableName, err := validateSQLIdentifierForMerge(tableName)
	if err != nil {
		return "", err
	}
	// This construction is safe since tableName is validated and quoted
	query := "SELECT COUNT(*) FROM " + safeTableName
	return query, nil
}

// buildCreateTableQuery safely constructs a CREATE TABLE AS query.
func buildCreateTableQuery(tableName, fromClause string) (string, error) {
	safeTableName, err := validateSQLIdentifierForMerge(tableName)
	if err != nil {
		return "", err
	}
	// This construction is safe since tableName is validated and quoted
	query := "CREATE TABLE " + safeTableName + " AS " + fromClause
	return query, nil
}
