package client

import (
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/url"
	"strings"

	"irmin-connectors/db"

	firecrawl "github.com/mendableai/firecrawl-go"
)

const (
	// Operation types
	OperationTypeScrape = "scrape"
	OperationTypeCrawl  = "crawl"
	OperationTypeMap    = "map"
	OperationTypeSearch = "search"

	// Output formats
	OutputFormatMarkdown = "markdown"
	OutputFormatHTML     = "html"
	OutputFormatJSON     = "json"

	// Default API URL
	DefaultAPIURL = "https://api.firecrawl.dev"

	// Default filename for documents
	defaultDocumentFilename = "document"

	// Maximum length for query suffix in filename
	maxQuerySuffixLength = 8

	// Maximum length for generated filenames
	maxFilenameLength = 100
)

// FirecrawlClient represents a client for interacting with the Firecrawl API.
type FirecrawlClient struct {
	App           *firecrawl.FirecrawlApp
	OperationType string
	OutputFormat  string
	URL           string
	Query         string
	Limit         *int
	WaitFor       *int
}

// Config holds the configuration for the Firecrawl client.
type Config struct {
	APIKey        string `json:"api_key"`
	OperationType string `json:"operation_type"`
	OutputFormat  string `json:"output_format"`
	URL           string `json:"url"`
	Query         string `json:"query"`
	Limit         *int   `json:"limit,omitempty"`
	WaitFor       *int   `json:"wait_for,omitempty"`
}

// InitFirecrawlClient initializes a Firecrawl client from operation configuration.
func InitFirecrawlClient(_ any, logger *slog.Logger, operation *db.Operation) (*FirecrawlClient, error) {
	// Parse configuration from operation details
	var config map[string]any
	if err := json.Unmarshal(operation.Details, &config); err != nil {
		return nil, fmt.Errorf("failed to unmarshal operation details: %w", err)
	}

	// Parse settings from operation settings
	var settings map[string]any
	if err := json.Unmarshal(operation.Settings, &settings); err != nil {
		return nil, fmt.Errorf("failed to unmarshal operation settings: %w", err)
	}

	// Validate configuration before proceeding
	if err := ValidateConfiguration(config); err != nil {
		return nil, fmt.Errorf("invalid configuration: %w", err)
	}

	// Extract and validate required fields
	apiKey, operationType, outputFormat, err := extractRequiredFields(config)
	if err != nil {
		return nil, err
	}

	// Extract URL or query based on operation type
	targetURL, query, err := extractURLOrQuery(config, operationType)
	if err != nil {
		return nil, err
	}

	// Extract optional limit from details
	limit := extractLimit(config)

	// Extract optional waitFor setting from settings (for JavaScript rendering)
	waitFor := extractWaitFor(settings)

	// Initialize Firecrawl app
	app, err := firecrawl.NewFirecrawlApp(apiKey, DefaultAPIURL)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize Firecrawl client: %w", err)
	}

	client := &FirecrawlClient{
		App:           app,
		OperationType: operationType,
		OutputFormat:  outputFormat,
		URL:           targetURL,
		Query:         query,
		Limit:         limit,
		WaitFor:       waitFor,
	}

	logger.Info("Firecrawl client initialized",
		"operation_type", operationType,
		"output_format", outputFormat,
		"url", targetURL,
		"query", query,
	)

	return client, nil
}

// extractRequiredFields extracts and validates the required configuration fields.
func extractRequiredFields(config map[string]any) (string, string, string, error) {
	apiKey, ok := config["api_key"].(string)
	if !ok || apiKey == "" {
		return "", "", "", errors.New("api_key is required")
	}

	operationType, ok := config["operation_type"].(string)
	if !ok || operationType == "" {
		return "", "", "", errors.New("operation_type is required")
	}

	outputFormat, ok := config["output_format"].(string)
	if !ok || outputFormat == "" {
		outputFormat = OutputFormatMarkdown // default to markdown
	}

	return apiKey, operationType, outputFormat, nil
}

// extractURLOrQuery extracts and validates URL or query based on operation type.
func extractURLOrQuery(config map[string]any, operationType string) (string, string, error) {
	targetURL := extractString(config, "url")
	query := extractString(config, "query")

	if operationType == OperationTypeSearch {
		if query == "" {
			return "", "", errors.New("query is required for search operation")
		}
	} else {
		if targetURL == "" {
			return "", "", errors.New("url is required for scrape, crawl, and map operations")
		}
	}

	return targetURL, query, nil
}

// extractLimit extracts the optional limit from configuration.
func extractLimit(config map[string]any) *int {
	limitVal, exists := config["limit"]
	if !exists || limitVal == nil {
		return nil
	}

	switch v := limitVal.(type) {
	case float64:
		l := int(v)
		return &l
	case int:
		return &v
	case string:
		var l int
		if _, err := fmt.Sscanf(v, "%d", &l); err == nil {
			return &l
		}
	}
	return nil
}

// extractWaitFor extracts the optional wait_for setting from configuration.
// This setting tells Firecrawl to wait for JavaScript to render before capturing content.
func extractWaitFor(settings map[string]any) *int {
	if settings == nil {
		return nil
	}

	waitForVal, exists := settings["wait_for"]
	if !exists || waitForVal == nil {
		return nil
	}

	switch v := waitForVal.(type) {
	case float64:
		w := int(v)
		if w > 0 {
			return &w
		}
	case int:
		if v > 0 {
			return &v
		}
	case string:
		var w int
		if _, err := fmt.Sscanf(v, "%d", &w); err == nil && w > 0 {
			return &w
		}
	}
	return nil
}

// ValidateConfiguration validates the Firecrawl client configuration.
func ValidateConfiguration(config map[string]any) error {
	// Validate API key
	apiKey, ok := config["api_key"].(string)
	if !ok || apiKey == "" {
		return errors.New("api_key is required")
	}

	// Validate operation type
	operationType, ok := config["operation_type"].(string)
	if !ok || operationType == "" {
		return errors.New("operation_type is required")
	}

	validOperationTypes := map[string]bool{
		OperationTypeScrape: true,
		OperationTypeCrawl:  true,
		OperationTypeMap:    true,
		OperationTypeSearch: true,
	}
	if !validOperationTypes[operationType] {
		return fmt.Errorf("invalid operation_type: %s (must be scrape, crawl, map, or search)", operationType)
	}

	// Validate output format if provided
	if outputFormat, exists := config["output_format"]; exists && outputFormat != nil {
		format, isString := outputFormat.(string)
		if isString && format != "" {
			validFormats := map[string]bool{
				OutputFormatMarkdown: true,
				OutputFormatHTML:     true,
				OutputFormatJSON:     true,
			}
			if !validFormats[format] {
				return fmt.Errorf("invalid output_format: %s (must be markdown, html, or json)", format)
			}
		}
	}

	// Validate URL or query based on operation type
	if operationType == OperationTypeSearch {
		query := extractString(config, "query")
		if query == "" {
			return errors.New("query is required for search operation")
		}
	} else {
		targetURL := extractString(config, "url")
		if targetURL == "" {
			return errors.New("url is required for scrape, crawl, and map operations")
		}
		// Validate URL format
		if _, err := url.Parse(targetURL); err != nil {
			return fmt.Errorf("invalid url format: %w", err)
		}
	}

	return nil
}

// Scrape performs a scrape operation on a single URL.
func (c *FirecrawlClient) Scrape() (map[string][]byte, error) {
	if c.URL == "" {
		return nil, errors.New("url is required for scrape operation")
	}

	// Prepare scrape parameters
	params := &firecrawl.ScrapeParams{
		Formats: c.getFormats(),
		WaitFor: c.WaitFor,
	}

	// Perform scrape
	doc, err := c.App.ScrapeURL(c.URL, params)
	if err != nil {
		return nil, fmt.Errorf("failed to scrape URL: %w", err)
	}

	if doc == nil {
		return nil, errors.New("no document returned from scrape")
	}

	// Convert document to files
	files, err := c.documentToFiles(doc, c.URL)
	if err != nil {
		return nil, fmt.Errorf("failed to convert scraped document: %w", err)
	}

	return files, nil
}

// Crawl performs a crawl operation on a URL and all its subpages.
func (c *FirecrawlClient) Crawl() (map[string][]byte, error) {
	if c.URL == "" {
		return nil, errors.New("url is required for crawl operation")
	}

	// Prepare crawl parameters
	params := &firecrawl.CrawlParams{
		ScrapeOptions: firecrawl.ScrapeParams{
			Formats: c.getFormats(),
			WaitFor: c.WaitFor,
		},
		Limit: c.Limit,
	}

	// Perform crawl (synchronous - waits for completion)
	result, err := c.App.CrawlURL(c.URL, params, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to crawl URL: %w", err)
	}

	if result == nil {
		return nil, errors.New("no response returned from crawl")
	}

	// Verify crawl completed successfully
	if result.Status != "completed" {
		return nil, fmt.Errorf("crawl operation did not complete successfully: status=%s", result.Status)
	}

	if len(result.Data) == 0 {
		return nil, errors.New("no documents returned from crawl")
	}

	// Convert all documents to files
	files := make(map[string][]byte)
	filenameCounts := make(map[string]int) // Track filename usage for collision detection
	for _, doc := range result.Data {
		if doc != nil {
			docFiles, convertErr := c.documentToFiles(doc, c.getSourceURL(doc))
			if convertErr != nil {
				return nil, fmt.Errorf("failed to convert document to file: %w", convertErr)
			}
			// Handle filename collisions by adding a counter suffix
			for filename, content := range docFiles {
				uniqueFilename := DeduplicateFilename(filename, filenameCounts, files)
				files[uniqueFilename] = content
			}
		}
	}

	return files, nil
}

// Map performs a map operation to discover all URLs from a website.
func (c *FirecrawlClient) Map() (map[string][]byte, error) {
	if c.URL == "" {
		return nil, errors.New("url is required for map operation")
	}

	// Prepare map parameters
	params := &firecrawl.MapParams{
		Limit: c.Limit,
	}

	// Perform map
	result, err := c.App.MapURL(c.URL, params)
	if err != nil {
		return nil, fmt.Errorf("failed to map URL: %w", err)
	}

	if result == nil {
		return nil, errors.New("no response returned from map")
	}

	if !result.Success {
		return nil, fmt.Errorf("map operation failed: %s", result.Error)
	}

	// Convert links to JSON
	type MapResult struct {
		Success   bool     `json:"success"`
		SourceURL string   `json:"source_url"`
		Links     []string `json:"links"`
		Count     int      `json:"count"`
	}

	mapResult := MapResult{
		Success:   true,
		SourceURL: c.URL,
		Links:     result.Links,
		Count:     len(result.Links),
	}

	jsonBytes, err := json.MarshalIndent(mapResult, "", "  ")
	if err != nil {
		return nil, fmt.Errorf("failed to marshal map result: %w", err)
	}

	return map[string][]byte{
		"sitemap.json": jsonBytes,
	}, nil
}

// Search performs a search operation (note: may not be available in all API versions).
func (c *FirecrawlClient) Search() (map[string][]byte, error) {
	if c.Query == "" {
		return nil, errors.New("query is required for search operation")
	}

	// Note: Search is not implemented in firecrawl-go SDK v1.0.0.
	// The SDK function unconditionally returns an error, so we return a clear message.
	// When the SDK is updated to support Search, this should be changed to call c.App.Search().
	return nil, errors.New("search operation is not available: firecrawl API v1.0.0 does not support search")
}

// Execute runs the configured operation and returns the resulting files.
func (c *FirecrawlClient) Execute() (map[string][]byte, error) {
	switch c.OperationType {
	case OperationTypeScrape:
		return c.Scrape()
	case OperationTypeCrawl:
		return c.Crawl()
	case OperationTypeMap:
		return c.Map()
	case OperationTypeSearch:
		return c.Search()
	default:
		return nil, fmt.Errorf("unknown operation type: %s", c.OperationType)
	}
}

// getFormats returns the Firecrawl formats based on the configured output format.
func (c *FirecrawlClient) getFormats() []string {
	switch c.OutputFormat {
	case OutputFormatHTML:
		return []string{"html"}
	case OutputFormatJSON:
		return []string{"markdown", "html"} // Get both for JSON output
	default:
		return []string{"markdown"}
	}
}

// documentToFiles converts a Firecrawl document to file(s) based on output format.
func (c *FirecrawlClient) documentToFiles(
	doc *firecrawl.FirecrawlDocument,
	sourceURL string,
) (map[string][]byte, error) {
	files := make(map[string][]byte)

	// Generate a filename from the URL
	baseName := URLToFilename(sourceURL)

	switch c.OutputFormat {
	case OutputFormatHTML:
		if doc.HTML != "" {
			files[baseName+".html"] = []byte(doc.HTML)
		} else if doc.RawHTML != "" {
			files[baseName+".html"] = []byte(doc.RawHTML)
		}
	case OutputFormatJSON:
		// Create a structured JSON output
		type JSONDocument struct {
			URL         string                               `json:"url"`
			Title       string                               `json:"title,omitempty"`
			Description string                               `json:"description,omitempty"`
			Markdown    string                               `json:"markdown,omitempty"`
			HTML        string                               `json:"html,omitempty"`
			Links       []string                             `json:"links,omitempty"`
			Metadata    *firecrawl.FirecrawlDocumentMetadata `json:"metadata,omitempty"`
		}

		jsonDoc := JSONDocument{
			URL:      sourceURL,
			Markdown: doc.Markdown,
			HTML:     doc.HTML,
			Links:    doc.Links,
			Metadata: doc.Metadata,
		}

		if doc.Metadata != nil {
			if doc.Metadata.Title != nil {
				jsonDoc.Title = *doc.Metadata.Title
			}
			if doc.Metadata.Description != nil {
				jsonDoc.Description = *doc.Metadata.Description
			}
		}

		jsonBytes, err := json.MarshalIndent(jsonDoc, "", "  ")
		if err != nil {
			return nil, fmt.Errorf("failed to marshal JSON document for %s: %w", sourceURL, err)
		}
		files[baseName+".json"] = jsonBytes
	default: // markdown
		if doc.Markdown != "" {
			files[baseName+".md"] = []byte(doc.Markdown)
		}
	}

	return files, nil
}

// getSourceURL extracts the source URL from a document's metadata.
func (c *FirecrawlClient) getSourceURL(doc *firecrawl.FirecrawlDocument) string {
	if doc.Metadata != nil && doc.Metadata.SourceURL != nil {
		return *doc.Metadata.SourceURL
	}
	return c.URL
}

// URLToFilename converts a URL to a valid filename.
func URLToFilename(urlStr string) string {
	if urlStr == "" {
		return defaultDocumentFilename
	}

	parsed, err := url.Parse(urlStr)
	if err != nil {
		return defaultDocumentFilename
	}

	// Start with hostname
	name := parsed.Hostname()

	// Add path (replace slashes with underscores)
	path := strings.Trim(parsed.Path, "/")
	if path != "" {
		path = strings.ReplaceAll(path, "/", "_")
		name = name + "_" + path
	}

	// Include query string hash if present (to differentiate URLs with different queries)
	if parsed.RawQuery != "" {
		// Use first 8 chars of sanitized query as a suffix to keep filename readable
		querySuffix := SanitizeFilename(parsed.RawQuery)
		if len(querySuffix) > maxQuerySuffixLength {
			querySuffix = querySuffix[:maxQuerySuffixLength]
		}
		if querySuffix != "" {
			name = name + "_q" + querySuffix
		}
	}

	// Sanitize the filename
	name = SanitizeFilename(name)

	// Limit length to 100, but preserve the query suffix if it exists
	if len(name) > maxFilenameLength {
		name = name[:maxFilenameLength]
	}

	if name == "" {
		return defaultDocumentFilename
	}

	return name
}

// DeduplicateFilename ensures filename uniqueness by adding a counter suffix when collisions occur.
func DeduplicateFilename(filename string, filenameCounts map[string]int, existingFiles map[string][]byte) string {
	// Check if this exact filename already exists
	if _, exists := existingFiles[filename]; !exists {
		filenameCounts[filename] = 1
		return filename
	}

	// Split filename into base and extension
	base := filename
	ext := ""
	if lastDot := strings.LastIndex(filename, "."); lastDot != -1 {
		base = filename[:lastDot]
		ext = filename[lastDot:]
	}

	// Find next available counter
	counter := filenameCounts[filename]
	for {
		counter++
		uniqueFilename := fmt.Sprintf("%s_%d%s", base, counter, ext)
		if _, exists := existingFiles[uniqueFilename]; !exists {
			filenameCounts[filename] = counter
			return uniqueFilename
		}
	}
}

// SanitizeFilename removes or replaces invalid characters from a filename.
func SanitizeFilename(filename string) string {
	var result strings.Builder
	for _, char := range filename {
		switch {
		case char >= 'a' && char <= 'z',
			char >= 'A' && char <= 'Z',
			char >= '0' && char <= '9',
			char == '.',
			char == '-',
			char == '_':
			result.WriteRune(char)
		case char == ' ':
			result.WriteRune('_')
		}
	}
	return result.String()
}

// extractString safely extracts a string value from a map.
func extractString(config map[string]any, key string) string {
	if val, exists := config[key]; exists && val != nil {
		if str, ok := val.(string); ok {
			return str
		}
	}
	return ""
}
