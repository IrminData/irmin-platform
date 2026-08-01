# Test Data Directory

This directory contains sample data files for testing Irmin connectors in the E2E test suite.

## Files

### test-data.json
Sample JSON data with user records. Can be used for:
- Testing HTTP connector push operations
- Testing JSON data handling
- General data validation tests

Format: Array of user objects with fields:
- `id` (number)
- `name` (string)
- `email` (string)
- `age` (number)
- `department` (string)
- `active` (boolean)
- `created_at` (ISO 8601 timestamp)

### test-data.csv
Same data as test-data.json but in CSV format. Can be used for:
- Testing database connectors (PostgreSQL, MySQL)
- Testing file-based connectors (SFTP)
- CSV import/export testing

### test-patches.json
Sample JSON Patch operations following RFC 6902 standard. Can be used for:
- Testing patch capability
- Testing update operations
- Testing partial data modifications

Operations included:
- `replace` - Update existing field values
- `add` - Add new records
- `remove` - Delete records

## Usage in Tests

These files can be referenced in `test-config.json`:

```json
{
  "connectors": {
    "postgres": {
      "testData": {
        "pushFile": "test-data/test-data.csv",
        "patchFile": "test-data/test-patches.json"
      }
    },
    "http": {
      "testData": {
        "pushFile": "test-data/test-data.json",
        "patchFile": "test-data/test-patches.json"
      }
    }
  }
}
```

## Creating Custom Test Data

To create custom test data for your specific use case:

1. **JSON**: Create a `.json` file with your data structure
2. **CSV**: Export from Excel/Google Sheets or create manually
3. **Patches**: Follow JSON Patch RFC 6902 format
4. **Parquet**: Use Python with `pyarrow` or Go with a Parquet library

### Example: Creating JSON Patch

```json
[
  {
    "op": "replace",
    "path": "/table.json/id/field",
    "value": "new value"
  }
]
```

## Notes

- All test data should be non-sensitive and safe to commit to version control
- Keep test datasets small (5-10 records) for fast test execution
- Use realistic but fake data (no real user information)
- Test data should cover edge cases (empty strings, nulls, special characters, etc.)

