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

You have access to the Irmin data platform through this AI Application. Irmin is a versioned data warehouse that stores structured data in repositories, similar to how Git stores code.`, aiApp.Name)

	if aiApp.Description != "" {
		header += fmt.Sprintf("\n\n**Application Description:** %s", aiApp.Description)
	}

	return header
}

func generateDataSourcesSection(aiApp *db.AIApplication) string {
	if len(aiApp.DataSources) == 0 {
		return "## Data Sources\n\nNo data sources configured for this AI Application."
	}

	section := "## Available Data Sources\n\nYou have access to the following repositories and paths:\n"

	var dataSourcesBuilder strings.Builder
	for _, ds := range aiApp.DataSources {
		path := ds.Path
		if path == "" {
			path = "/ (root)"
		} else {
			path = "/" + path
		}
		branch := ds.Branch
		if branch == "" {
			branch = "(default branch)"
		}
		dataSourcesBuilder.WriteString(
			fmt.Sprintf("\n- **%s** - Branch: `%s`, Path: `%s`", ds.Repository.Slug, branch, path),
		)
	}
	section += dataSourcesBuilder.String()

	return section
}

func generateToolsSection(config db.AIApplicationToolConfig) string {
	section := "## Available Tools\n\nThe following tools are available for data access:\n"

	if config.QueryEnabled {
		section += "\n- **irmin_execute_sql** - Execute SQL queries on repository data using DuckDB"
	}
	if config.SchemaEnabled {
		section += "\n- **irmin_get_object_schema** - Get the schema/structure of a data object"
	}
	if config.ListObjectsEnabled {
		section += "\n- **irmin_list_objects** - List files and folders in a repository"
	}
	if config.GetContentEnabled {
		section += "\n- **irmin_get_object_content** - Get the raw content of a file"
	}
	if config.VectorSearchEnabled {
		section += "\n- **irmin_search_embeddings** - Search for similar content using vector embeddings"
	}
	if config.DocsEnabled {
		section += "\n- **irmin_get_documentation** - Get comprehensive documentation for this AI Application, including SQL syntax guide and tool usage instructions"
	}

	// Always available
	section += "\n- **irmin_ai_app_info** - Get information about this AI Application"

	return section
}

func generateSQLSyntaxSection() string {
	return `## SQL Query Syntax (DuckDB)

Irmin uses DuckDB for SQL queries. DuckDB's SQL dialect is based on PostgreSQL.

### Querying Data

Use Irmin placeholders to reference data objects:

` + "```sql" + `
-- Basic query syntax
SELECT * FROM $["repository;path/to/file.json"] LIMIT 10;

-- With branch reference
SELECT * FROM $["repository;data.json@main"] LIMIT 10;

-- Joining multiple files
SELECT a.id, b.name 
FROM $["repo;users.json"] a
JOIN $["repo;orders.json"] b ON a.id = b.user_id;
` + "```" + `

### Placeholder Format

` + "```" + `
$["repository;object@ref"]
` + "```" + `

- **repository** (required): The repository slug
- **object** (required): The file path (e.g., "data.json", "folder/file.csv")
- **ref** (optional): Branch, tag, or commit reference

### Supported File Formats

- JSON (.json) - read_json
- CSV (.csv) - read_csv
- Parquet (.parquet) - read_parquet
- Excel (.xlsx) - read_excel

### Common Functions

` + "```sql" + `
-- Aggregations
SELECT COUNT(*), AVG(price), SUM(quantity) FROM $["repo;sales.json"];

-- Filtering
SELECT * FROM $["repo;users.json"] WHERE age > 25 AND status = 'active';

-- Grouping
SELECT category, COUNT(*) FROM $["repo;products.json"] GROUP BY category;

-- Ordering
SELECT * FROM $["repo;data.json"] ORDER BY created_at DESC LIMIT 100;
` + "```" + `

### Best Practices

1. Always use LIMIT to avoid returning too much data
2. Use irmin_get_object_schema first to understand the data structure
3. Use irmin_list_objects to discover available files
4. Reference files by their full path within the repository`
}

func generateVectorSearchSection() string {
	return `## Vector Similarity Search

You can search for semantically similar content using the embedding search tool.

### Prerequisites

Embedding files (.parquet) must exist in the repository. These are created by vectorizing source files.

### Search Parameters

- **repository**: The repository containing the embedding file
- **embedding_path**: Path to the .parquet embedding file
- **query**: Natural language search query
- **top_k**: Number of results to return (default: 10)
- **filter**: Optional metadata filters

### Usage Tips

1. Use irmin_list_objects to find available embedding files (.parquet files with embedding metadata)
2. Phrase your query as a natural language question or description
3. Adjust top_k based on how many results you need
4. Use filters to narrow down results by source file or other metadata`
}
