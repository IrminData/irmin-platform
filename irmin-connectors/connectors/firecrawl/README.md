# Firecrawl Connector

The Firecrawl connector enables web scraping and crawling powered by the [Firecrawl API](https://firecrawl.dev). Convert entire websites into clean markdown, HTML, or structured JSON data for use in your data pipelines and AI applications.

## Features

- **Scrape**: Extract content from a single URL
- **Crawl**: Extract content from a URL and all its accessible subpages
- **Map**: Quickly discover all URLs from a website
- **Search**: Search the web and get full content from results

## Configuration

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `api_key` | Secret | Your Firecrawl API key from [firecrawl.dev](https://firecrawl.dev) |
| `operation_type` | Select | Type of operation: `scrape`, `crawl`, `map`, or `search` |
| `output_format` | Select | Output format: `markdown`, `html`, or `json` |

### Conditional Fields

| Field | Type | Description | Required For |
|-------|------|-------------|--------------|
| `url` | Text | Target URL to process | scrape, crawl, map |
| `query` | Text | Search query | search |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `limit` | Integer | Maximum number of pages/results (1-1000) |

## Operations

### Scrape

Extracts content from a single URL and returns it in the configured output format.

**Output**: Single file named after the URL hostname/path.

### Crawl

Automatically discovers and extracts content from a URL and all its accessible subpages. The crawl respects robots.txt and follows internal links.

**Output**: Multiple files, one for each page discovered.

### Map

Quickly discovers all URLs from a website without extracting content. Useful for site audits and understanding website structure.

**Output**: `sitemap.json` containing all discovered URLs.

### Search

Searches the web and returns extracted content from the top results.

**Output**: `search-results.json` with search results.

## Output Formats

### Markdown (.md)

Clean, readable markdown format. Ideal for:
- Documentation
- LLM/AI applications
- Content migration

### HTML (.html)

Full HTML content. Useful for:
- Web applications
- Content analysis
- Preserving formatting

### JSON (.json)

Structured JSON with content and metadata:
```json
{
  "url": "https://example.com",
  "title": "Page Title",
  "description": "Meta description",
  "markdown": "# Content...",
  "html": "<h1>Content...</h1>",
  "links": ["https://example.com/page1", "..."],
  "metadata": {
    "title": "Page Title",
    "description": "Meta description",
    "language": "en",
    "ogTitle": "...",
    "ogDescription": "...",
    "..."
  }
}
```

## Capabilities

| Capability | Supported |
|------------|-----------|
| Pull | ✅ |
| Push | ❌ |
| Patch | ❌ |
| Subscribe | ❌ |

## Example Use Cases

1. **Documentation Ingestion**: Scrape documentation sites to create knowledge bases for AI assistants.

2. **Content Migration**: Crawl an entire website and convert it to markdown for migration to a new CMS.

3. **Site Auditing**: Use map operation to discover all pages on a website for SEO analysis.

4. **Research**: Search for topics and extract full content from results for analysis.

## Rate Limits

Rate limits depend on your Firecrawl API plan. See [Firecrawl Rate Limits](https://docs.firecrawl.dev/rate-limits) for details.

## Error Handling

The connector handles common errors:
- Invalid API key
- URL not accessible
- Rate limit exceeded
- Crawl timeout

Errors are logged to the operation logs with detailed messages.

## Resources

- [Firecrawl Documentation](https://docs.firecrawl.dev)
- [Firecrawl API Reference](https://docs.firecrawl.dev/api-reference)
- [Get API Key](https://firecrawl.dev)

