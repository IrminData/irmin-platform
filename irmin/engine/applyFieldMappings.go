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

// ProcessFieldMappings applies field mappings to a set of files, creating the DuckDB client internally.
// This is the main entry point for pipeline field_mapping stages.
func (c *Client) ProcessFieldMappings(
	ctx context.Context,
	files map[string][]byte,
	fieldMappings []irminmodels.FieldMapping,
) (map[string][]byte, error) {
	result, errs := c.processFieldMappings(ctx, files, fieldMappings)
	if len(errs) > 0 {
		return nil, errs[0]
	}
	return result, nil
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
	if err := c.validateApplyFieldMappingsInput(duckDBClient, originalFilePath); err != nil {
		return nil, err
	}

	// If file content is empty, return it as-is (nothing to transform)
	if len(fileContent) == 0 {
		return map[string][]byte{originalFilePath: fileContent}, nil
	}

	// If no mappings, return the original content with the original path
	if len(mappings) == 0 {
		return map[string][]byte{originalFilePath: fileContent}, nil
	}

	// Filter mappings before any DuckDB work so files that no mapping
	// targets (binary blobs from folder-pull connectors like Google
	// Drive, sibling assets in a multi-file zip, etc.) passthrough
	// without paying the cost of getReadOptions or a temp-file round
	// trip — and without failing on content types DuckDB can't parse
	// (PDFs, images, etc.).
	relevantMappings := c.filterMappingsForSourceFile(mappings, originalFilePath)
	if len(relevantMappings) == 0 {
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

	// If JSON unwrapping is needed, validate and apply it
	effectiveInputPath, effectiveReadOpts, cleanupUnwrap, unwrapErr := c.applyJSONUnwrapIfNeeded(
		ctx, duckDBClient, relevantMappings, tempInputPath, readOpts, objectDetails, originalFilePath,
	)
	if unwrapErr != nil {
		return nil, unwrapErr
	}
	if cleanupUnwrap != nil {
		defer cleanupUnwrap()
	}

	// Get schema information from the (possibly unwrapped) file
	columnNames, err := c.getFileSchema(ctx, duckDBClient, effectiveInputPath, effectiveReadOpts, originalFilePath)
	if err != nil {
		return nil, err
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
			effectiveInputPath,
			effectiveReadOpts,
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
			effectiveInputPath,
			effectiveReadOpts,
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
	originalFilePath string,
) error {
	if duckDBClient == nil {
		return errors.New("duckDBClient cannot be nil")
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

// sanitizeDuckDBType validates that the given type name is an allowed DuckDB type.
// Returns the uppercase type name if valid, or an empty string if not.
// The whitelist prevents SQL injection through the CastType field.
func sanitizeDuckDBType(typeName string) string {
	upper := strings.ToUpper(strings.TrimSpace(typeName))
	switch upper {
	case "VARCHAR", "TEXT", "INTEGER", "INT", "BIGINT", "SMALLINT", "TINYINT", "HUGEINT",
		"DOUBLE", "FLOAT", "REAL", "DECIMAL", "BOOLEAN", "BOOL",
		"DATE", "TIMESTAMP", "TIME", "BLOB", "UUID":
		return upper
	default:
		return ""
	}
}

// buildSelectClauseForDestination constructs the SELECT clause for a specific destination.
func (c *Client) buildSelectClauseForDestination(mappings []irminmodels.FieldMapping) string {
	var selectExpressions []string

	for _, mapping := range mappings {
		if expr := c.buildFieldExpression(mapping); expr != "" {
			selectExpressions = append(selectExpressions, expr)
		}
	}

	if len(selectExpressions) == 0 {
		return "*" // Fallback to all fields if no valid mappings
	}

	return strings.Join(selectExpressions, ", ")
}

// buildFieldExpression builds a single SELECT expression for a field mapping,
// applying TRY_CAST and rename as needed. Returns empty string if the mapping has no source field.
func (c *Client) buildFieldExpression(mapping irminmodels.FieldMapping) string {
	if mapping.SourceField == nil || *mapping.SourceField == "" {
		return ""
	}

	expr := quoteIdentifier(*mapping.SourceField)

	// Apply CAST if CastType is specified and valid
	if mapping.CastType != nil && *mapping.CastType != "" {
		sanitized := sanitizeDuckDBType(*mapping.CastType)
		if sanitized != "" {
			expr = fmt.Sprintf("TRY_CAST(%s AS %s)", expr, sanitized)
		} else {
			c.Logger.Warn("invalid cast type ignored",
				"cast_type", *mapping.CastType,
				"source_field", *mapping.SourceField,
			)
		}
	}

	// Apply rename if DestinationField differs
	if mapping.DestinationField != nil && *mapping.DestinationField != "" {
		expr = fmt.Sprintf("%s AS %s", expr, quoteIdentifier(*mapping.DestinationField))
	}

	return expr
}

// buildSelectClauseForUnmappedFields constructs the SELECT clause for unmapped fields.
func (c *Client) buildSelectClauseForUnmappedFields(unmappedFields []string) string {
	var selectExpressions []string
	for _, field := range unmappedFields {
		selectExpressions = append(selectExpressions, quoteIdentifier(field))
	}
	return strings.Join(selectExpressions, ", ")
}

// getJSONPathFromMappings returns the SourceJSONPath if any mapping has one set.
// All mappings for the same source file must use the same JSON path; conflicting paths log a warning.
func (c *Client) getJSONPathFromMappings(mappings []irminmodels.FieldMapping) string {
	var found string
	for _, mapping := range mappings {
		if mapping.SourceJSONPath != nil && *mapping.SourceJSONPath != "" {
			if found == "" {
				found = *mapping.SourceJSONPath
			} else if found != *mapping.SourceJSONPath {
				c.Logger.Warn("conflicting source_json_path values in field mappings, using first",
					"using", found,
					"ignored", *mapping.SourceJSONPath,
				)
			}
		}
	}
	return found
}

// applyJSONUnwrapIfNeeded checks if any mapping requires JSON unwrapping and applies it.
// Returns the effective input path and read options (possibly from the unwrapped file),
// plus an optional cleanup function for the temp file.
func (c *Client) applyJSONUnwrapIfNeeded(
	ctx context.Context,
	duckDBClient *duckdb.QueryClient,
	relevantMappings []irminmodels.FieldMapping,
	tempInputPath string,
	readOpts *duckdb.ReadOptions,
	objectDetails irminutils.ObjectDetails,
	originalFilePath string,
) (string, *duckdb.ReadOptions, func(), error) {
	jsonPath := c.getJSONPathFromMappings(relevantMappings)
	if jsonPath == "" {
		return tempInputPath, readOpts, nil, nil
	}

	// Validate that the source file is JSON — unwrapping only works on JSON
	ct := strings.ToLower(objectDetails.ContentType)
	if !strings.Contains(ct, "json") {
		return "", nil, nil, fmt.Errorf(
			"source_json_path is set but file %q has content type %q (JSON unwrapping requires a JSON file)",
			originalFilePath, ct,
		)
	}

	unwrappedContent, unwrapErr := c.unwrapJSONAtPath(
		ctx, duckDBClient, tempInputPath, readOpts, jsonPath, objectDetails.Name,
	)
	if unwrapErr != nil {
		return "", nil, nil, fmt.Errorf("failed to unwrap JSON at path %q: %w", jsonPath, unwrapErr)
	}

	unwrappedPath, cleanup, tempErr := c.createTempInputFile(ctx, unwrappedContent, objectDetails.Name)
	if tempErr != nil {
		return "", nil, nil, fmt.Errorf("failed to create temp file for unwrapped data: %w", tempErr)
	}

	return unwrappedPath, readOpts, cleanup, nil
}

// unwrapJSONAtPath reads a JSON file, extracts the array at the given dot-notation path
// using DuckDB's UNNEST, and returns the unwrapped content as JSON.
func (c *Client) unwrapJSONAtPath(
	ctx context.Context,
	duckDBClient *duckdb.QueryClient,
	tempInputPath string,
	readOpts *duckdb.ReadOptions,
	jsonPath string,
	fileName string,
) ([]byte, error) {
	// Build the nested path expression with proper quoting
	// e.g., "data" or "response"."items"
	pathParts := strings.Split(jsonPath, ".")
	var quotedParts []string
	for _, part := range pathParts {
		quotedParts = append(quotedParts, quoteIdentifier(part))
	}
	quotedPath := strings.Join(quotedParts, ".")

	// UNNEST on an array of structs produces a struct-typed column. To flatten
	// struct fields into individual top-level columns we wrap in a subquery:
	//   SELECT * FROM (SELECT UNNEST("data") AS u FROM read_json(...)) AS _sq
	// We pass this subquery as the "tempInputPath" with empty readOpts so that
	// executeTransformation generates: COPY (SELECT * FROM <subquery>) TO ...
	readQueryPart := duckdb.BuildReadQuery(tempInputPath, readOpts)
	subquery := fmt.Sprintf(
		"(SELECT u.* FROM (SELECT UNNEST(%s) AS u FROM %s) AS _sq)",
		quotedPath, readQueryPart,
	)

	// Use executeTransformation with the subquery as input and nil inputReadOpts
	// so BuildReadQuery is bypassed — we pass the subquery directly.
	return c.executeTransformationRaw(
		ctx,
		duckDBClient,
		subquery,
		readOpts,
		"*",
		fileName,
	)
}
