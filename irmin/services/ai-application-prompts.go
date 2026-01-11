package services

import (
	"fmt"
	"irmin-api/db"
	"strings"
)

// GenerateAIApplicationSystemPrompt generates a recommended system prompt for an AI Application.
// This prompt includes information about the available tools, data sources, and SQL syntax.
func (api *APIServices) GenerateAIApplicationSystemPrompt(aiApp *db.AIApplication) string {
	var sections []string

	// Header section
	sections = append(sections, generateHeaderSection(aiApp))

	// Data sources section
	sections = append(sections, generateDataSourcesSection(aiApp))

	// Tools section
	config := aiApp.ParseToolConfig()
	sections = append(sections, generateToolsSection(config))

	// SQL syntax guide (only if query tool is enabled)
	if config.QueryEnabled {
		sections = append(sections, generateSQLSyntaxSection())
	}

	// Vector search guide (only if vector search is enabled)
	if config.VectorSearchEnabled {
		sections = append(sections, generateVectorSearchSection())
	}

	return strings.Join(sections, "\n\n")
}

func generateHeaderSection(aiApp *db.AIApplication) string {
	header := fmt.Sprintf(`## Irmin AI Application: %s

You have access to structured data through this AI Application. Data is organized in paths that you can browse, query, and search.`, aiApp.Name)

	if aiApp.Description != "" {
		header += fmt.Sprintf("\n\n**Application Description:** %s", aiApp.Description)
	}

	return header
}

func generateDataSourcesSection(aiApp *db.AIApplication) string {
	if len(aiApp.DataSources) == 0 {
		return "## Data Sources\n\nNo data sources configured for this AI Application."
	}

	section := "## Available Data Sources\n\nYou have access to the following data paths. Use these paths with the available tools:\n"

	var dataSourcesBuilder strings.Builder
	for _, ds := range aiApp.DataSources {
		// Build unified path using helper to handle leading slashes correctly
		unifiedPath := BuildUnifiedPath(ds.Repository.Slug, ds.Path)
		dataSourcesBuilder.WriteString(fmt.Sprintf("\n- `%s`", unifiedPath))
	}
	section += dataSourcesBuilder.String()

	return section
}

func generateToolsSection(config db.AIApplicationToolConfig) string {
	section := "## Available Tools\n\nThe following tools are available for data access. All tools use unified paths (e.g., `/data-source/folder/file.json`):\n"

	if config.QueryEnabled {
		section += "\n- **irmin_execute_sql** - Execute SQL queries on data using DuckDB"
	}
	if config.SchemaEnabled {
		section += "\n- **irmin_get_object_schema** - Get the schema/structure of a data file (columns, types)"
	}
	if config.ListObjectsEnabled {
		section += "\n- **irmin_list_objects** - List files and folders at a path (or all data sources if path is empty)"
	}
	if config.GetContentEnabled {
		section += "\n- **irmin_get_object_content** - Get the raw content of a file"
	}
	if config.VectorSearchEnabled {
		section += "\n- **irmin_search_embeddings** - Search for similar content using natural language (searches all embeddings if path is empty)"
	}
	if config.DocsEnabled {
		section += "\n- **irmin_get_documentation** - Get comprehensive documentation including SQL syntax guide"
	}

	// Always available
	section += "\n- **irmin_ai_app_info** - Get information about available data sources and tools"

	return section
}

func generateSQLSyntaxSection() string {
	return `## SQL Query Syntax (DuckDB)

Use DuckDB SQL (PostgreSQL-compatible) to query data files.

### Querying Data

Reference data files using placeholders with the data source name and path:

` + "```sql" + `
-- Basic query syntax (data-source is the first part of your unified path)
SELECT * FROM $["data-source;path/to/file.json"] LIMIT 10;

-- Joining multiple files
SELECT a.id, b.name 
FROM $["data-source;users.json"] a
JOIN $["data-source;orders.json"] b ON a.id = b.user_id;
` + "```" + `

### Placeholder Format

` + "```" + `
$["data-source;path/to/file"]
` + "```" + `

- **data-source**: The first part of your unified path (before the first /)
- **path/to/file**: The file path within that data source

### Supported File Formats

- JSON (.json)
- CSV (.csv)
- Parquet (.parquet)
- Excel (.xlsx)

### Common Functions

` + "```sql" + `
-- Aggregations
SELECT COUNT(*), AVG(price), SUM(quantity) FROM $["data-source;sales.json"];

-- Filtering
SELECT * FROM $["data-source;users.json"] WHERE age > 25 AND status = 'active';

-- Grouping
SELECT category, COUNT(*) FROM $["data-source;products.json"] GROUP BY category;

-- Ordering
SELECT * FROM $["data-source;data.json"] ORDER BY created_at DESC LIMIT 100;
` + "```" + `

### Best Practices

1. Always use LIMIT to avoid returning too much data
2. Use irmin_get_object_schema first to understand the data structure
3. Use irmin_list_objects to discover available files`
}

func generateVectorSearchSection() string {
	return `## Vector Similarity Search

Search for semantically similar content using natural language queries.

### Search Parameters

- **query** (required): Natural language search query
- **path** (optional): Unified path to a specific embedding file. If empty, searches all available embeddings.
- **top_k** (optional): Number of results to return (default: 10)
- **filter** (optional): Metadata filters

### Usage Tips

1. Start with an empty path to search across all available embeddings
2. Phrase your query as a natural language question or description
3. Use irmin_list_objects to find specific embedding files if needed
4. Use filters to narrow down results by source file or other metadata`
}
