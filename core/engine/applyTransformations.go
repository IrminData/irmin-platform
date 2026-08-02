package engine

import (
	"context"
	"errors"
	"fmt"
	"irmin-api/duckdb"
	"maps"
	"path/filepath"
	"slices"
	"strings"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
	irminutils "github.com/IrminData/irmin-platform/sdks/go/utils"
)

// TransformConfig holds the configuration for a transformation operation.
type TransformConfig struct {
	// Operation type
	Operation irminmodels.TransformOperationType

	// Mode: "single" or "all"
	Mode string

	// For single mode: the specific file to target
	TargetName string

	// For field_rename operation
	FieldRenames []irminmodels.FieldRename

	// For field_remove operation
	FieldsToRemove []string

	// For file_rename operation
	OutputName string

	// For format_convert operation
	OutputFormat irminmodels.OutputFormat
}

// ProcessTransformations applies transformations to the input files and returns transformed results.
// This is the main entry point for transform operations, creating the DuckDB client internally.
func (c *Client) ProcessTransformations(
	ctx context.Context,
	files map[string][]byte,
	config TransformConfig,
) (map[string][]byte, error) {
	if len(files) == 0 {
		return nil, errors.New("no files to transform")
	}

	// Filter files based on mode
	filesToTransform, filesToPassThrough, err := c.filterFilesByMode(files, config)
	if err != nil {
		return nil, err
	}

	// Handle operations that don't need DuckDB
	if config.Operation == irminmodels.TransformOpFileRename {
		return c.processFileRenameOperation(filesToTransform, filesToPassThrough, config)
	}
	if config.Operation == irminmodels.TransformOpFileRemove {
		return c.processFileRemoveOperation(filesToPassThrough), nil
	}

	// Create DuckDB client for other operations
	duckDBClient, err := duckdb.NewQueryClient(ctx, c.Env, c.Logger)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize DuckDB client: %w", err)
	}
	defer duckDBClient.Close()

	// Apply transformations
	transformedFiles, err := c.ApplyTransformations(ctx, duckDBClient, filesToTransform, config)
	if err != nil {
		return nil, err
	}

	// Merge with pass-through files
	for fileName, content := range filesToPassThrough {
		if _, exists := transformedFiles[fileName]; exists {
			return nil, fmt.Errorf(
				"filename collision: transformed file and pass-through file both named '%s'",
				fileName,
			)
		}
		transformedFiles[fileName] = content
	}

	return transformedFiles, nil
}

// filterFilesByMode filters files based on transform mode (single or all).
func (c *Client) filterFilesByMode(
	files map[string][]byte,
	config TransformConfig,
) (map[string][]byte, map[string][]byte, error) {
	filesToTransform := make(map[string][]byte)
	filesToPassThrough := make(map[string][]byte)

	mode := config.Mode
	if mode == "" {
		mode = "all"
	}

	// Validate that TargetName is provided when mode is "single"
	if mode == "single" && config.TargetName == "" {
		return nil, nil, errors.New("target_name is required when transform_mode is 'single'")
	}

	if mode == "single" {
		// Single mode: only transform the target file
		for fileName, content := range files {
			if fileName == config.TargetName {
				filesToTransform[fileName] = content
			} else {
				filesToPassThrough[fileName] = content
			}
		}
		if len(filesToTransform) == 0 {
			return nil, nil, fmt.Errorf("target file '%s' not found in previous stage results", config.TargetName)
		}
	} else {
		// All mode: transform all files
		filesToTransform = files
	}

	return filesToTransform, filesToPassThrough, nil
}

// processFileRenameOperation handles file rename operations without DuckDB.
func (c *Client) processFileRenameOperation(
	filesToTransform map[string][]byte,
	filesToPassThrough map[string][]byte,
	config TransformConfig,
) (map[string][]byte, error) {
	// Validate that mode is "single" since you can't rename multiple files to the same name
	if len(filesToTransform) > 1 {
		return nil, fmt.Errorf(
			"file_rename operation requires 'single' mode when multiple files are present (found %d files)",
			len(filesToTransform),
		)
	}

	results := make(map[string][]byte)
	for fileName, content := range filesToTransform {
		newName, newContent, err := c.applyFileRename(fileName, content, config.OutputName)
		if err != nil {
			return nil, err
		}
		if _, exists := results[newName]; exists {
			return nil, fmt.Errorf(
				"filename collision: multiple files renamed to '%s' (original files: %s and at least one other)",
				newName,
				fileName,
			)
		}
		results[newName] = newContent
	}

	// Add pass-through files
	for fileName, content := range filesToPassThrough {
		if _, exists := results[fileName]; exists {
			return nil, fmt.Errorf(
				"filename collision: renamed file and pass-through file both named '%s'",
				fileName,
			)
		}
		results[fileName] = content
	}

	return results, nil
}

// processFileRemoveOperation handles file remove operations without DuckDB.
// It returns only the pass-through files, effectively removing the targeted files.
func (c *Client) processFileRemoveOperation(
	filesToPassThrough map[string][]byte,
) map[string][]byte {
	// Simply return pass-through files (files not targeted for removal)
	results := make(map[string][]byte)

	maps.Copy(results, filesToPassThrough)

	return results
}

// ApplyTransformations applies a transformation operation to the provided files.
// It returns a new map with the transformed file content.
//
// Parameters:
//   - ctx: Context for cancellation and logging
//   - duckDBClient: DuckDB client for executing queries
//   - files: Map of filename to file content
//   - config: Transformation configuration
//
// Returns a map of (possibly renamed) filenames to transformed content, or an error.
//
//nolint:gocognit // Complexity is acceptable for this function
func (c *Client) ApplyTransformations(
	ctx context.Context,
	duckDBClient *duckdb.QueryClient,
	files map[string][]byte,
	config TransformConfig,
) (map[string][]byte, error) {
	if duckDBClient == nil {
		return nil, errors.New("duckDBClient cannot be nil")
	}
	if len(files) == 0 {
		return nil, errors.New("files cannot be empty")
	}

	results := make(map[string][]byte)

	for fileName, fileContent := range files {
		// For empty files, handle operations that require filename changes
		if len(fileContent) == 0 {
			c.Logger.WarnContext(ctx, "processing empty file in transformation", "filename", fileName)

			transformedName := fileName
			transformedContent := fileContent

			// Apply filename changes for operations that require them
			switch config.Operation {
			case irminmodels.TransformOpFormatConvert:
				// Change extension even for empty files
				outputReadOpts, outputExt, err := c.getOutputFormatOptions(config.OutputFormat)
				if err != nil {
					return nil, fmt.Errorf("failed to get output format options for empty file %s: %w", fileName, err)
				}
				_ = outputReadOpts // Not needed for empty files, but validate the format
				transformedName = changeFileExtension(fileName, outputExt)
			case irminmodels.TransformOpFileRename:
				// Rename even empty files
				if config.OutputName == "" {
					return nil, fmt.Errorf("output_name is required for file_rename operation on file: %s", fileName)
				}
				transformedName = config.OutputName
			case irminmodels.TransformOpFileRemove:
				// Remove the file from the pipeline
				c.Logger.InfoContext(ctx, "empty file removed from pipeline", "filename", fileName)
				continue
			case irminmodels.TransformOpFieldRename, irminmodels.TransformOpFieldRemove:
				// These operations don't change filename, and empty files pass through
				// No changes needed
			default:
				return nil, fmt.Errorf("unknown transform operation: %s", config.Operation)
			}

			// Check for filename collisions
			if _, exists := results[transformedName]; exists {
				return nil, fmt.Errorf(
					"filename collision: multiple files transformed to the same name '%s' (original files include: %s)",
					transformedName,
					fileName,
				)
			}

			results[transformedName] = transformedContent
			continue
		}

		transformedName, transformedContent, err := c.transformSingleFile(
			ctx,
			duckDBClient,
			fileName,
			fileContent,
			config,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to transform file %s: %w", fileName, err)
		}

		// If transformedName is empty, it means the file should be removed (file_remove operation)
		if transformedName == "" {
			c.Logger.InfoContext(ctx, "file removed from pipeline", "filename", fileName)
			continue
		}

		// Check for filename collisions
		if _, exists := results[transformedName]; exists {
			return nil, fmt.Errorf(
				"filename collision: multiple files transformed to the same name '%s' (original files include: %s)",
				transformedName,
				fileName,
			)
		}

		results[transformedName] = transformedContent
	}

	return results, nil
}

// transformSingleFile transforms a single file according to the config.
func (c *Client) transformSingleFile(
	ctx context.Context,
	duckDBClient *duckdb.QueryClient,
	fileName string,
	fileContent []byte,
	config TransformConfig,
) (string, []byte, error) {
	switch config.Operation {
	case irminmodels.TransformOpFieldRename:
		return c.applyFieldRename(ctx, duckDBClient, fileName, fileContent, config.FieldRenames)
	case irminmodels.TransformOpFieldRemove:
		return c.applyFieldRemove(ctx, duckDBClient, fileName, fileContent, config.FieldsToRemove)
	case irminmodels.TransformOpFileRename:
		return c.applyFileRename(fileName, fileContent, config.OutputName)
	case irminmodels.TransformOpFileRemove:
		return c.applyFileRemoveOp()
	case irminmodels.TransformOpFormatConvert:
		return c.applyFormatConvert(ctx, duckDBClient, fileName, fileContent, config.OutputFormat)
	default:
		return "", nil, fmt.Errorf("unknown transform operation: %s", config.Operation)
	}
}

// applyFieldRename renames fields in the file.
func (c *Client) applyFieldRename(
	ctx context.Context,
	duckDBClient *duckdb.QueryClient,
	fileName string,
	fileContent []byte,
	renames []irminmodels.FieldRename,
) (string, []byte, error) {
	if len(renames) == 0 {
		return fileName, fileContent, nil
	}

	// Validate that the input file is a structured data format
	inputExt := strings.ToLower(filepath.Ext(fileName))
	supportedInputFormats := map[string]bool{
		extCSV: true, extTSV: true, extJSON: true, extParquet: true,
	}

	if !supportedInputFormats[inputExt] {
		return "", nil, fmt.Errorf(
			"field_rename only supports structured data formats (csv, tsv, json, parquet), got: %s",
			inputExt,
		)
	}

	objectDetails := irminutils.ParseObjectDetailsFromPath(fileName)
	readOpts, err := c.getReadOptions(&objectDetails, fileName)
	if err != nil {
		return "", nil, err
	}

	// Create temp input file
	tempInputPath, cleanup, err := c.createTempInputFile(ctx, fileContent, objectDetails.Name)
	if err != nil {
		return "", nil, err
	}
	defer cleanup()

	// Get file schema
	columnNames, err := c.getFileSchema(ctx, duckDBClient, tempInputPath, readOpts, fileName)
	if err != nil {
		return "", nil, err
	}

	// Build rename map
	renameMap := make(map[string]string)
	for _, r := range renames {
		renameMap[r.OldName] = r.NewName
	}

	// Build SELECT clause with renames
	selectClause := c.buildRenameSelectClause(columnNames, renameMap)

	// Execute transformation
	transformedContent, err := c.executeTransformation(
		ctx,
		duckDBClient,
		tempInputPath,
		readOpts,
		readOpts, // Keep same format
		selectClause,
		objectDetails.Name,
	)
	if err != nil {
		return "", nil, err
	}

	return fileName, transformedContent, nil
}

// buildRenameSelectClause builds a SELECT clause that renames specified columns.
func (c *Client) buildRenameSelectClause(columnNames []string, renameMap map[string]string) string {
	var selectExpressions []string
	for _, col := range columnNames {
		if newName, ok := renameMap[col]; ok {
			selectExpressions = append(
				selectExpressions,
				fmt.Sprintf(`%s AS %s`, quoteIdentifier(col), quoteIdentifier(newName)),
			)
		} else {
			selectExpressions = append(selectExpressions, quoteIdentifier(col))
		}
	}
	return strings.Join(selectExpressions, ", ")
}

// applyFieldRemove removes specified fields from the file.
func (c *Client) applyFieldRemove(
	ctx context.Context,
	duckDBClient *duckdb.QueryClient,
	fileName string,
	fileContent []byte,
	fieldsToRemove []string,
) (string, []byte, error) {
	if len(fieldsToRemove) == 0 {
		return fileName, fileContent, nil
	}

	// Validate that the input file is a structured data format
	inputExt := strings.ToLower(filepath.Ext(fileName))
	supportedInputFormats := map[string]bool{
		extCSV: true, extTSV: true, extJSON: true, extParquet: true,
	}

	if !supportedInputFormats[inputExt] {
		return "", nil, fmt.Errorf(
			"field_remove only supports structured data formats (csv, tsv, json, parquet), got: %s",
			inputExt,
		)
	}

	objectDetails := irminutils.ParseObjectDetailsFromPath(fileName)
	readOpts, err := c.getReadOptions(&objectDetails, fileName)
	if err != nil {
		return "", nil, err
	}

	// Create temp input file
	tempInputPath, cleanup, err := c.createTempInputFile(ctx, fileContent, objectDetails.Name)
	if err != nil {
		return "", nil, err
	}
	defer cleanup()

	// Get file schema
	columnNames, err := c.getFileSchema(ctx, duckDBClient, tempInputPath, readOpts, fileName)
	if err != nil {
		return "", nil, err
	}

	// Build SELECT clause excluding removed fields
	selectClause := c.buildRemoveSelectClause(columnNames, fieldsToRemove)
	if selectClause == "" {
		return "", nil, errors.New("cannot remove all fields from file")
	}

	// Execute transformation
	transformedContent, err := c.executeTransformation(
		ctx,
		duckDBClient,
		tempInputPath,
		readOpts,
		readOpts, // Keep same format
		selectClause,
		objectDetails.Name,
	)
	if err != nil {
		return "", nil, err
	}

	return fileName, transformedContent, nil
}

// buildRemoveSelectClause builds a SELECT clause that excludes specified columns.
func (c *Client) buildRemoveSelectClause(columnNames []string, fieldsToRemove []string) string {
	var selectExpressions []string
	for _, col := range columnNames {
		if !slices.Contains(fieldsToRemove, col) {
			selectExpressions = append(selectExpressions, quoteIdentifier(col))
		}
	}
	return strings.Join(selectExpressions, ", ")
}

// applyFileRename renames the file without modifying content.
func (c *Client) applyFileRename(
	fileName string,
	fileContent []byte,
	outputName string,
) (string, []byte, error) {
	if outputName == "" {
		return "", nil, fmt.Errorf("output_name is required for file_rename operation on file: %s", fileName)
	}
	return outputName, fileContent, nil
}

// applyFileRemoveOp removes the file from the pipeline by returning an empty filename.
func (c *Client) applyFileRemoveOp() (string, []byte, error) {
	// Return empty string for filename to signal removal
	return "", nil, nil
}

// applyFormatConvert converts the file to a different format.
func (c *Client) applyFormatConvert(
	ctx context.Context,
	duckDBClient *duckdb.QueryClient,
	fileName string,
	fileContent []byte,
	outputFormat irminmodels.OutputFormat,
) (string, []byte, error) {
	if outputFormat == "" {
		return "", nil, errors.New("output_format is required for format_convert operation")
	}

	// Validate that the input file is a structured data format
	objectDetails := irminutils.ParseObjectDetailsFromPath(fileName)
	inputExt := strings.ToLower(filepath.Ext(fileName))

	// Only allow conversions between structured data formats
	supportedInputFormats := map[string]bool{
		extCSV: true, extTSV: true, extJSON: true, extParquet: true,
	}

	if !supportedInputFormats[inputExt] {
		return "", nil, fmt.Errorf(
			"format_convert only supports structured data formats (csv, tsv, json, parquet), got: %s",
			inputExt,
		)
	}

	inputReadOpts, err := c.getReadOptions(&objectDetails, fileName)
	if err != nil {
		return "", nil, err
	}

	// Create temp input file
	tempInputPath, cleanup, err := c.createTempInputFile(ctx, fileContent, objectDetails.Name)
	if err != nil {
		return "", nil, err
	}
	defer cleanup()

	// Get output read options based on target format
	outputReadOpts, outputExt, err := c.getOutputFormatOptions(outputFormat)
	if err != nil {
		return "", nil, err
	}

	// Generate new filename with new extension
	newFileName := changeFileExtension(fileName, outputExt)
	newObjectDetails := irminutils.ParseObjectDetailsFromPath(newFileName)

	// Execute transformation (SELECT * to keep all columns)
	transformedContent, err := c.executeTransformation(
		ctx,
		duckDBClient,
		tempInputPath,
		inputReadOpts,
		outputReadOpts,
		"*",
		newObjectDetails.Name,
	)
	if err != nil {
		return "", nil, err
	}

	return newFileName, transformedContent, nil
}

// getOutputFormatOptions returns DuckDB read options and file extension for the output format.
func (c *Client) getOutputFormatOptions(format irminmodels.OutputFormat) (*duckdb.ReadOptions, string, error) {
	switch format {
	case irminmodels.OutputFormatCSV:
		return &duckdb.ReadOptions{
			FormatOption: "CSV",
			Parameters:   map[string]string{},
		}, ".csv", nil
	case irminmodels.OutputFormatJSON:
		return &duckdb.ReadOptions{
			FormatOption: "JSON",
			Parameters:   map[string]string{},
		}, ".json", nil
	case irminmodels.OutputFormatParquet:
		return &duckdb.ReadOptions{
			FormatOption: "PARQUET",
			Parameters:   map[string]string{},
		}, ".parquet", nil
	default:
		return nil, "", fmt.Errorf("unsupported output format: %s (must be csv, json, or parquet)", format)
	}
}
