package engine

import (
	"database/sql"
	"errors"
	"fmt"
	"irmin-api/duckdb"
	"os"
	"strings"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	irminutils "github.com/IrminData/irmin-sdk-go/utils"
)

// FieldMappingResult represents the result of applying field mappings,
// containing the destination file path and its transformed content.
type FieldMappingResult struct {
	Path    string `json:"path"`
	Content []byte `json:"content"`
}

// ApplyFieldMappings applies field mapping transformations to split file content across multiple destinations.
// This function implements a "field routing" approach where:
// - Fields with explicit mappings are routed to their specified destinations
// - Unmapped fields are included in a "remainder" file using the original path
// - Each destination gets only the fields explicitly mapped to it
//
// Parameters:
//   - duckDBClient: DuckDB client for executing queries
//   - fileContent: Raw file content to transform
//   - originalFilePath: Original file path (used for format detection and naming)
//   - mappings: Field mapping rules (source -> destination paths and column names)
//
// Returns a map of destination file paths to their transformed content, or an error.
func (c *Client) ApplyFieldMappings(
	duckDBClient *duckdb.QueryClient,
	fileContent []byte,
	originalFilePath string,
	mappings []irminmodels.FieldMapping,
) (map[string][]byte, error) {
	// Input validation
	if err := c.validateApplyFieldMappingsInput(duckDBClient, fileContent, originalFilePath); err != nil {
		return nil, err
	}

	// If no mappings, return the original content with the original path
	if len(mappings) == 0 {
		return map[string][]byte{originalFilePath: fileContent}, nil
	}

	// Parse file details and get read options
	objectDetails := irminutils.ParseObjectDetailsFromPath(originalFilePath)
	readOpts, err := c.getReadOptions(&objectDetails, originalFilePath)
	if err != nil {
		return nil, err
	}

	// Create temporary input file with the content
	tempInputPath, cleanup1, err := c.createTempInputFile(fileContent, objectDetails.Name)
	if err != nil {
		return nil, err
	}
	defer cleanup1()

	// Get schema information from the file
	columnNames, err := c.getFileSchema(duckDBClient, tempInputPath, readOpts, originalFilePath)
	if err != nil {
		return nil, err
	}

	// Filter mappings to only include those relevant to this source file
	relevantMappings := c.filterMappingsForSourceFile(mappings, originalFilePath)
	if len(relevantMappings) == 0 {
		return map[string][]byte{originalFilePath: fileContent}, nil
	}

	// Identify which fields are mapped and which are unmapped
	mappedFields := c.getMappedFields(relevantMappings)
	unmappedFields := c.getUnmappedFields(columnNames, mappedFields)

	// Group mappings by destination path
	mappingsByDestination := c.groupMappingsByDestination(relevantMappings)

	// Process each destination file
	results := make(map[string][]byte)

	// Process mapped destinations
	for destinationPath, destMappings := range mappingsByDestination {
		selectClause := c.buildSelectClauseForDestination(destMappings)

		destObjectDetails := irminutils.ParseObjectDetailsFromPath(destinationPath)
		destReadOpts, readOptsErr := c.getReadOptions(&destObjectDetails, destinationPath)
		if readOptsErr != nil {
			return nil, fmt.Errorf("failed to get read options for destination %s: %w", destinationPath, readOptsErr)
		}

		transformedContent, transformErr := c.executeTransformation(
			duckDBClient,
			tempInputPath,
			readOpts,
			destReadOpts,
			selectClause,
			destObjectDetails.Name,
		)
		if transformErr != nil {
			return nil, fmt.Errorf("failed to transform data for destination %s: %w", destinationPath, transformErr)
		}

		results[destinationPath] = transformedContent
	}

	// Include unmapped fields in the original file (if any exist)
	if len(unmappedFields) > 0 {
		unmappedSelectClause := c.buildSelectClauseForUnmappedFields(unmappedFields)

		remainderContent, transformErr := c.executeTransformation(
			duckDBClient,
			tempInputPath,
			readOpts,
			readOpts, // Use same format as original
			unmappedSelectClause,
			objectDetails.Name,
		)
		if transformErr != nil {
			return nil, fmt.Errorf("failed to create remainder file with unmapped fields: %w", transformErr)
		}

		results[originalFilePath] = remainderContent
	}

	return results, nil
}

// validateApplyFieldMappingsInput validates the input parameters.
func (c *Client) validateApplyFieldMappingsInput(
	duckDBClient *duckdb.QueryClient,
	fileContent []byte,
	originalFilePath string,
) error {
	if duckDBClient == nil {
		return errors.New("duckDBClient cannot be nil")
	}
	if len(fileContent) == 0 {
		return errors.New("fileContent cannot be empty")
	}
	if strings.TrimSpace(originalFilePath) == "" {
		return errors.New("originalFilePath cannot be empty")
	}
	return nil
}

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
func (c *Client) createTempInputFile(fileContent []byte, fileName string) (string, func(), error) {
	tempFile, err := os.CreateTemp("", "duckdb-input-*"+fileName)
	if err != nil {
		return "", nil, fmt.Errorf("failed to create temp input file: %w", err)
	}

	tempFilePath := tempFile.Name()

	cleanup := func() {
		if removeErr := os.Remove(tempFilePath); removeErr != nil {
			c.Logger.Error("failed to remove temp input file", "error", removeErr)
		}
	}

	// Write content using the existing file handle
	if _, writeErr := tempFile.Write(fileContent); writeErr != nil {
		closeErr := tempFile.Close()
		if closeErr != nil {
			c.Logger.Error("failed to close temp input file", "error", closeErr)
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
	duckDBClient *duckdb.QueryClient,
	tempInputPath string,
	readOpts *duckdb.ReadOptions,
	originalFilePath string,
) ([]string, error) {
	readQueryPart := duckdb.BuildReadQuery(tempInputPath, readOpts)
	describeQuery := fmt.Sprintf("DESCRIBE SELECT * FROM %s;", readQueryPart)

	rows, err := duckDBClient.ExecuteQuery(describeQuery)
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

// filterMappingsForSourceFile filters mappings to only include those relevant to the source file.
func (c *Client) filterMappingsForSourceFile(
	mappings []irminmodels.FieldMapping,
	sourceFilePath string,
) []irminmodels.FieldMapping {
	var relevantMappings []irminmodels.FieldMapping
	for _, mapping := range mappings {
		if mapping.SourcePath == sourceFilePath {
			relevantMappings = append(relevantMappings, mapping)
		}
	}
	return relevantMappings
}

// groupMappingsByDestination groups field mappings by their destination path.
func (c *Client) groupMappingsByDestination(mappings []irminmodels.FieldMapping) map[string][]irminmodels.FieldMapping {
	groups := make(map[string][]irminmodels.FieldMapping)
	for _, mapping := range mappings {
		destPath := mapping.DestinationPath
		groups[destPath] = append(groups[destPath], mapping)
	}
	return groups
}

// getMappedFields returns a set of all fields that have explicit mappings.
func (c *Client) getMappedFields(mappings []irminmodels.FieldMapping) map[string]bool {
	mappedFields := make(map[string]bool)
	for _, mapping := range mappings {
		if mapping.SourceField != nil && *mapping.SourceField != "" {
			mappedFields[*mapping.SourceField] = true
		}
	}
	return mappedFields
}

// getUnmappedFields returns fields that don't have any explicit mappings.
func (c *Client) getUnmappedFields(allFields []string, mappedFields map[string]bool) []string {
	var unmappedFields []string
	for _, field := range allFields {
		if !mappedFields[field] {
			unmappedFields = append(unmappedFields, field)
		}
	}
	return unmappedFields
}

// buildSelectClauseForDestination constructs the SELECT clause for a specific destination.
func (c *Client) buildSelectClauseForDestination(mappings []irminmodels.FieldMapping) string {
	var selectExpressions []string

	for _, mapping := range mappings {
		if mapping.SourceField != nil && mapping.DestinationField != nil &&
			*mapping.SourceField != "" && *mapping.DestinationField != "" {
			selectExpressions = append(selectExpressions,
				fmt.Sprintf(`"%s" AS "%s"`, *mapping.SourceField, *mapping.DestinationField))
		} else if mapping.SourceField != nil && *mapping.SourceField != "" {
			// Field mapping without rename
			selectExpressions = append(selectExpressions,
				fmt.Sprintf(`"%s"`, *mapping.SourceField))
		}
	}

	if len(selectExpressions) == 0 {
		return "*" // Fallback to all fields if no valid mappings
	}

	return strings.Join(selectExpressions, ", ")
}

// buildSelectClauseForUnmappedFields constructs the SELECT clause for unmapped fields.
func (c *Client) buildSelectClauseForUnmappedFields(unmappedFields []string) string {
	var selectExpressions []string
	for _, field := range unmappedFields {
		selectExpressions = append(selectExpressions, fmt.Sprintf(`"%s"`, field))
	}
	return strings.Join(selectExpressions, ", ")
}

// executeTransformation performs the actual data transformation using DuckDB.
func (c *Client) executeTransformation(
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
		c.Logger.Error("failed to close temp output file", "error", closeErr)
	}
	defer func() {
		if removeErr := os.Remove(tempOutputPath); removeErr != nil {
			c.Logger.Error("failed to remove temp output file", "error", removeErr)
		}
	}()

	// Build and execute the transformation query
	readQueryPart := duckdb.BuildReadQuery(tempInputPath, inputReadOpts)
	copyQuery := c.buildCopyQuery(selectClause, readQueryPart, tempOutputPath, outputReadOpts)

	if _, execErr := duckDBClient.ExecuteNonQuery(copyQuery); execErr != nil {
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
