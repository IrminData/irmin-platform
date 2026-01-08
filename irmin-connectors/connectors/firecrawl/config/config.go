package config

import (
	"irmin-connectors/connectors/common"
	"irmin-connectors/connectors/firecrawl/client"
	"irmin-connectors/models"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

const maxLimitValue = 1000

// GetDetailsFieldDefinitions returns all detail fields with their metadata.
func GetDetailsFieldDefinitions() map[string]irminmodels.DynamicField {
	details, _ := initializeFieldDefinitions()
	return details
}

// GetSettingsFieldDefinitions returns static settings fields.
func GetSettingsFieldDefinitions() map[string]irminmodels.DynamicField {
	_, settings := initializeFieldDefinitions()
	return settings
}

// GetRequiredFields returns the mandatory form fields for Firecrawl.
func GetRequiredFields() []string {
	details, settings := initializeFieldDefinitions()
	return common.GetRequiredFieldNames(details, settings)
}

// GetOptionalFields returns the optional form fields for Firecrawl.
func GetOptionalFields() []string {
	details, settings := initializeFieldDefinitions()
	return common.GetOptionalFieldNames(details, settings)
}

// GetDetailsFields returns the detail-specific fields.
func GetDetailsFields() []string {
	details, _ := initializeFieldDefinitions()
	return common.GetDetailsFieldNames(details)
}

// GetSettingsFields returns the settings-specific fields.
func GetSettingsFields() []string {
	_, settings := initializeFieldDefinitions()
	return common.GetSettingsFieldNames(settings)
}

func initializeFieldDefinitions() (map[string]irminmodels.DynamicField, map[string]irminmodels.DynamicField) {
	detailsFieldDefinitions := map[string]irminmodels.DynamicField{
		"api_key": {
			Type:     "text",
			Label:    "API Key",
			Example:  "fc-your-api-key",
			Required: true,
			HelpText: "Your Firecrawl API key. Get one at https://firecrawl.dev",
			Secret:   true,
		},
		"operation_type": {
			Type:     "select",
			Label:    "Operation Type",
			Required: true,
			HelpText: "The type of Firecrawl operation to perform.",
			Default:  client.OperationTypeScrape,
			Options: common.CreateSelectOptionsWithLabels(map[string]string{
				client.OperationTypeScrape: "Scrape - Extract content from a single URL",
				client.OperationTypeCrawl:  "Crawl - Extract content from URL and all subpages",
				client.OperationTypeMap:    "Map - Discover all URLs from a website",
				client.OperationTypeSearch: "Search - Search the web for content",
			}),
		},
		"url": {
			Type:     "text",
			Label:    "URL",
			Example:  "https://example.com",
			Required: false, // Conditional: required for scrape, crawl, map
			HelpText: "The target URL to scrape, crawl, or map. Required for scrape, crawl, and map operations.",
		},
		"query": {
			Type:     "text",
			Label:    "Search Query",
			Example:  "artificial intelligence news",
			Required: false, // Conditional: required for search
			HelpText: "The search query. Required for search operation.",
		},
		"output_format": {
			Type:     "select",
			Label:    "Output Format",
			Required: true,
			HelpText: "The format for the extracted content.",
			Default:  client.OutputFormatMarkdown,
			Options: common.CreateSelectOptionsWithLabels(map[string]string{
				client.OutputFormatMarkdown: "Markdown (.md)",
				client.OutputFormatHTML:     "HTML (.html)",
				client.OutputFormatJSON:     "JSON with metadata (.json)",
			}),
		},
		"limit": {
			Type:     "integer",
			Label:    "Limit",
			Required: false,
			Default:  "10",
			Min:      1,
			Max:      maxLimitValue,
			HelpText: "Maximum number of pages to crawl or search results to return.",
		},
	}

	settingsFieldDefinitions := map[string]irminmodels.DynamicField{
		// No settings fields for Firecrawl connector - all configuration is in details
	}

	return detailsFieldDefinitions, settingsFieldDefinitions
}

// GetConnectorInfo returns the default connector information for Firecrawl.
func GetConnectorInfo() models.ConnectorDetails {
	return models.ConnectorDetails{
		Name:             "Firecrawl",
		Description:      "Web scraping and crawling connector powered by Firecrawl. Convert websites into clean markdown, HTML, or JSON.",
		Version:          "1.0.0",
		StructureVersion: "1.0.0",
		Author:           "Tim Borovkov / Irmin",
		APIBaseURL:       "/firecrawl",
		LogoURL:          "/public/firecrawl.png",
		Capabilities: []irminmodels.ConnectorCapability{
			irminmodels.ConnectorCapabilityPull,
		},
		Locales:         []string{"en"},
		PrimaryCategory: irminmodels.ConnectorCategoryOther,
		Categories:      []irminmodels.ConnectorCategory{irminmodels.ConnectorCategoryOther},
		AuthorEmail:     "hello@irmin.co",
		ReadMoreURL:     "/firecrawl/details",
	}
}
