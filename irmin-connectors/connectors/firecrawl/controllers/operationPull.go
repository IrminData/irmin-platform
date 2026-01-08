package firecrawlcontrollers

import (
	"errors"
	"fmt"
	"log/slog"

	"irmin-connectors/connectors/common"
	"irmin-connectors/connectors/firecrawl/client"
	"irmin-connectors/db"

	"github.com/gofiber/fiber/v3"
)

// FirecrawlPullProvider implements the PullOperationProvider interface for Firecrawl.
type FirecrawlPullProvider struct {
	dbInstance *db.Database
	logger     *slog.Logger
}

// InitializeClient initializes the Firecrawl client for pull operations.
func (p *FirecrawlPullProvider) InitializeClient(
	c fiber.Ctx,
	logger *slog.Logger,
	operation *db.Operation,
) (any, *string, func(), error) {
	firecrawlClient, err := client.InitFirecrawlClient(c, logger, operation)
	if err != nil {
		return nil, nil, func() {}, fmt.Errorf("failed to initialize Firecrawl client: %w", err)
	}

	cleanup := func() {
		// Firecrawl client doesn't need explicit cleanup
	}

	// Firecrawl doesn't have a "database name" concept, so return nil
	return firecrawlClient, nil, cleanup, nil
}

// GetAllFiles executes the configured Firecrawl operation and returns the results as files.
func (p *FirecrawlPullProvider) GetAllFiles(c fiber.Ctx, clientAny any) ([]string, [][]byte, error) {
	firecrawlClient, ok := clientAny.(*client.FirecrawlClient)
	if !ok {
		return nil, nil, errors.New("invalid client type for Firecrawl pull provider")
	}

	operation, _ := c.Locals("operation").(*db.Operation)

	// Log operation start
	p.logOperationEvent(operation, db.LogEventTypeInfo, "Starting Firecrawl operation", map[string]any{
		"operation_type": firecrawlClient.OperationType,
		"output_format":  firecrawlClient.OutputFormat,
		"url":            firecrawlClient.URL,
		"query":          firecrawlClient.Query,
	})

	// Execute the configured operation
	files, err := firecrawlClient.Execute()
	if err != nil {
		p.logOperationEvent(operation, db.LogEventTypeError, "Firecrawl operation failed", map[string]any{
			"error":          err.Error(),
			"operation_type": firecrawlClient.OperationType,
			"url":            firecrawlClient.URL,
			"query":          firecrawlClient.Query,
		})
		return nil, nil, fmt.Errorf("firecrawl operation failed: %w", err)
	}

	// Convert map to slices
	filePaths := make([]string, 0, len(files))
	fileContents := make([][]byte, 0, len(files))

	for path, content := range files {
		filePaths = append(filePaths, path)
		fileContents = append(fileContents, content)
	}

	// Log successful completion
	p.logOperationEvent(operation, db.LogEventTypeInfo, "Firecrawl operation completed successfully", map[string]any{
		"operation_type": firecrawlClient.OperationType,
		"file_count":     len(filePaths),
		"url":            firecrawlClient.URL,
		"query":          firecrawlClient.Query,
	})

	return filePaths, fileContents, nil
}

// GetFileByPath retrieves a specific file by path.
// For Firecrawl, this is treated as a new URL to scrape.
func (p *FirecrawlPullProvider) GetFileByPath(c fiber.Ctx, clientAny any, path string) (string, []byte, error) {
	firecrawlClient, ok := clientAny.(*client.FirecrawlClient)
	if !ok {
		return "", nil, errors.New("invalid client type for Firecrawl pull provider")
	}

	// If a path is provided, treat it as a URL to scrape
	if path != "" {
		return p.scrapeSpecificURL(c, firecrawlClient, path)
	}

	// If no path provided, fall back to GetAllFiles behavior
	filePaths, fileContents, err := p.GetAllFiles(c, clientAny)
	if err != nil {
		return "", nil, err
	}

	if len(filePaths) == 0 {
		return "", nil, errors.New("no files returned from operation")
	}

	// Return the first file
	return filePaths[0], fileContents[0], nil
}

// scrapeSpecificURL scrapes a specific URL and returns the result.
func (p *FirecrawlPullProvider) scrapeSpecificURL(
	c fiber.Ctx,
	firecrawlClient *client.FirecrawlClient,
	path string,
) (string, []byte, error) {
	operation, _ := c.Locals("operation").(*db.Operation)

	// Create a modified client with the new URL
	modifiedClient := &client.FirecrawlClient{
		App:           firecrawlClient.App,
		OperationType: client.OperationTypeScrape, // Force scrape for specific path
		OutputFormat:  firecrawlClient.OutputFormat,
		URL:           path,
		Query:         "",
		Limit:         nil,
	}

	p.logOperationEvent(operation, db.LogEventTypeInfo, "Starting Firecrawl scrape for specific URL", map[string]any{
		"url":           path,
		"output_format": firecrawlClient.OutputFormat,
	})

	// Execute scrape
	files, err := modifiedClient.Scrape()
	if err != nil {
		p.logOperationEvent(operation, db.LogEventTypeError, "Firecrawl scrape failed for specific URL", map[string]any{
			"error": err.Error(),
			"url":   path,
		})
		return "", nil, fmt.Errorf("firecrawl scrape failed: %w", err)
	}

	// Return the first (and likely only) file
	for filePath, content := range files {
		p.logOperationEvent(
			operation, db.LogEventTypeInfo, "Firecrawl scrape completed for specific URL",
			map[string]any{"url": path, "filename": filePath},
		)
		return filePath, content, nil
	}

	return "", nil, errors.New("no content returned from scrape")
}

// logOperationEvent is a helper to log operation events when all required fields are present.
func (p *FirecrawlPullProvider) logOperationEvent(
	operation *db.Operation,
	eventType db.LogEventType,
	message string,
	data map[string]any,
) {
	if operation != nil && p.dbInstance != nil && p.logger != nil {
		common.LogOperationEvent(p.dbInstance, p.logger, operation.ID, eventType, message, data)
	}
}

// OperationPull godoc
// @Summary Pull data from Firecrawl
// @Description Execute the configured Firecrawl operation (scrape, crawl, map, or search) and return the results as files.
// @Tags firecrawl
// @Security OperationTokenAuth
// @Accept multipart/form-data
// @Produce json
// @Param operation_token formData string true "Operation token received from operation/init"
// @Param path formData string false "Optional URL to scrape (overrides configured URL for single-page scraping)"
// @Success 200 {object} fiber.Map "Data pulled successfully"
// @Failure 400 {object} fiber.Map "Bad request - invalid operation token"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /firecrawl/operation/pull [post]
func (cs *Controllers) OperationPull(c fiber.Ctx) error {
	provider := &FirecrawlPullProvider{
		dbInstance: cs.DB,
		logger:     cs.Logger,
	}
	return common.HandleOperationPull(c, provider, cs.Logger, cs.DB)
}
