package engine

import (
	"context"
	"errors"
	"fmt"
	"irmin-api/duckdb"
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
	ctx context.Context,
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
	tempInputPath, cleanup1, err := c.createTempInputFile(ctx, fileContent, objectDetails.Name)
	if err != nil {
		return nil, err
	}
	defer cleanup1()

	// Get schema information from the file
	columnNames, err := c.getFileSchema(ctx, duckDBClient, tempInputPath, readOpts, originalFilePath)
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
			ctx,
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
			ctx,
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
			selectExpressions = append(
				selectExpressions,
				fmt.Sprintf(
					`%s AS %s`,
					quoteIdentifier(*mapping.SourceField),
					quoteIdentifier(*mapping.DestinationField),
				),
			)
		} else if mapping.SourceField != nil && *mapping.SourceField != "" {
			// Field mapping without rename
			selectExpressions = append(selectExpressions,
				quoteIdentifier(*mapping.SourceField))
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
		selectExpressions = append(selectExpressions, quoteIdentifier(field))
	}
	return strings.Join(selectExpressions, ", ")
}
