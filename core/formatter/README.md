# Formatter

Response formatting utilities that transform internal data structures into consistent, API-friendly JSON responses. Ensures uniform data serialization across all API endpoints.

## Purpose

Provides consistent API response formatting for:

- **Data Serialization**: Convert internal models to API-compatible formats
- **ID Obfuscation**: Convert internal database IDs to external SQIDs for security
- **Field Filtering**: Include only relevant fields in responses
- **Data Transformation**: Apply business logic during serialization
- **Consistency**: Ensure uniform response structure across endpoints
- **Localization**: Support for internationalized field names and values

## Features

- **ID Conversion**: Converts internal database IDs to external SQIDs for security and obfuscation
- **Privacy Protection**: Excludes sensitive fields (passwords, tokens)
- **Data Enrichment**: Adds computed fields and relationships
- **Null Handling**: Consistent handling of optional and empty fields
- **Type Safety**: Ensures proper data types in JSON output
- **Pagination Support**: Formats paginated responses with metadata

## Integration

Used by **Controllers** to format all API responses before returning to clients. Maintains separation between internal data models and external API contracts.
