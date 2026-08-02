# Template Files

This package contains embedded template files for SQL queries and Go scripts.

## Structure

```
templatefiles/
├── library.go         # Template loader and parser
├── library_test.go    # Tests for template loading
├── queries/           # SQL query templates
│   ├── remove_duplicates.sql
│   ├── data_validation.sql
│   ├── field_mapping.sql
│   └── filter_records.sql
└── scripts/           # Go script templates
    ├── validate_data.go
    ├── data_migration.go
    └── batch_processor.go
```

## Template Format

### SQL Templates

SQL templates use `--` for comments:

```sql
-- Title: My Template
-- Description: What it does
-- Tags: tag1, tag2
-- Placeholders: table_name:users, column_name:email

SELECT * FROM {{table_name}} WHERE {{column_name}} = 'value';
```

### Go Script Templates

Go script templates use `//` for comments:

```go
//go:build ignore

// Title: My Template
// Description: What it does
// Tags: tag1, tag2
// Placeholders: repository_slug:my-repo, branch_name:main

package main

func main() {
    // Use {{repository_slug}} and {{branch_name}}
}
```

### Placeholder Format

Placeholders use the format `name:example` where:
- `name` is the placeholder variable name (e.g., `table_name`)
- `example` is an example value to help users understand what to provide (e.g., `users`)

Multiple placeholders are comma-separated:
```
-- Placeholders: table_name:users, column:email, filter:active
```

In the template content, placeholders are referenced using double curly braces:
```sql
SELECT * FROM {{table_name}} WHERE {{column}} = {{filter}}
```

## Usage

```go
import "irmin-api/templatefiles"

templates, err := templatefiles.GetAllTemplates()
if err != nil {
    log.Fatal(err)
}

for _, tmpl := range templates {
    fmt.Printf("%s: %s\n", tmpl.Title, tmpl.Description)
}
```

## Build Tags

All Go script templates include `//go:build ignore` at the top to prevent them from being compiled as part of the project. They are embedded as text files only via `go:embed`. This prevents "main redeclared" errors since each template has its own `package main` and `func main()`.

The parser automatically skips build tags when extracting metadata.
