# Generic HTTP Connector

This connector is a generic HTTP connector that can be used to connect to any HTTP endpoint for data import and export operations.

## Configuration

The HTTP connector supports the following configuration options:

### Connection Details
- **url** (required): The HTTP endpoint URL to connect to
- **method** (required): HTTP method (GET, POST, PUT, PATCH, DELETE)
- **headers** (optional): HTTP headers as a JSON object
- **body** (optional): Request body content for POST, PUT, PATCH methods
- **timeout** (optional): Request timeout in seconds (default: 30, max: 300)
- **verify_ssl** (optional): Whether to verify SSL certificates (default: true)

### Settings
No additional settings are required for HTTP connectors - all configuration is handled through the connection details.

## Capabilities

### Pull Operations
Make HTTP requests to the configured endpoint and return the response as a file. The connector automatically detects the content type using the Irmin SDK's comprehensive MIME type detection and generates appropriate filenames:

**Standard Formats:**
- JSON responses → `.json` files
- XML responses → `.xml` files  
- HTML responses → `.html` files
- Plain text → `.txt` files
- CSV data → `.csv` files
- Images → `.jpg`, `.png`, `.gif`, `.heic`, `.heif`, `.avif`, `.webp` files
- PDF documents → `.pdf` files

**Advanced Analytics Formats:**
- Apache Parquet → `.parquet` files
- Apache Avro → `.avro` files
- Apache ORC → `.orc` files
- Delta Lake → `.delta` files
- Apache Iceberg → `.iceberg` files

**Structured Data Formats:**
- JSON Lines → `.jsonl` files
- Newline-delimited JSON → `.ndjson` files
- Tab-separated values → `.tsv` files
- YAML → `.yaml`, `.yml` files
- Excel → `.xlsx`, `.xls`, `.xlsm`, `.xlsb` files

**Archive Formats:**
- ZIP archives → `.zip` files
- TAR archives → `.tar` files
- Compressed TAR → `.tar.gz`, `.tgz`, `.tar.bz2`, `.tbz2`, `.tar.xz`, `.txz` files
- RAR archives → `.rar` files
- 7-Zip archives → `.7z` files
- Compressed files → `.gz`, `.bz2`, `.xz`, `.lz`, `.lzma`, `.z` files
- Package formats → `.deb`, `.rpm`, `.cab` files
- Disk images → `.dmg`, `.iso`, `.img` files

### Push Operations
Send file content as the HTTP request body to the configured endpoint. The connector automatically sets appropriate Content-Type headers based on file extensions using the Irmin SDK's comprehensive MIME type detection:

**Standard Formats:**
- `.json` → `application/json`
- `.xml` → `application/xml`
- `.html` → `text/html`
- `.txt` → `text/plain`
- `.csv` → `text/csv`
- `.pdf` → `application/pdf`

**Advanced Analytics Formats:**
- `.parquet` → `application/vnd.apache.parquet`
- `.avro` → `application/vnd.apache.avro`
- `.orc` → `application/vnd.apache.orc`
- `.delta` → `application/x-delta-lake`
- `.iceberg` → `application/x-iceberg`

**Structured Data Formats:**
- `.jsonl` → `application/jsonl`
- `.ndjson` → `application/x-ndjson`
- `.tsv` → `text/tab-separated-values`
- `.yaml`, `.yml` → `application/x-yaml`
- `.xlsx` → `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- `.xls` → `application/vnd.ms-excel`
- `.xlsm` → `application/vnd.ms-excel.sheet.macroEnabled.12`
- `.xlsb` → `application/vnd.ms-excel.sheet.binary.macroEnabled.12`

**Archive Formats:**
- `.zip` → `application/zip`
- `.tar` → `application/x-tar`
- `.gz` → `application/gzip`
- `.bz2` → `application/x-bzip2`
- `.xz` → `application/x-xz`
- `.lz` → `application/x-lz`
- `.lzma` → `application/x-lzma`
- `.z` → `application/x-compress`
- `.rar` → `application/vnd.rar`
- `.7z` → `application/x-7z-compressed`
- `.cab` → `application/vnd.ms-cab-compressed`
- `.deb` → `application/vnd.debian.binary-package`
- `.rpm` → `application/x-rpm`
- `.dmg` → `application/x-apple-diskimage`
- `.iso` → `application/x-iso9660-image`
- `.img` → `application/x-raw-disk-image`

**Other files** → `application/octet-stream`

### Unsupported Operations
- **Patch Operations**: Not supported (returns appropriate error message)
- **Webhook Subscriptions**: Not supported (returns appropriate error message)

## URL Configuration
The HTTP connector uses the full URL provided in the connection details for all operations. No additional path configuration is needed. 

## Usage Examples

### Pull Example

**Configuration:**
```json
{
  "url": "https://api.example.com/v1/users",
  "method": "GET",
  "headers": {
    "Authorization": "Bearer <token>"
  },
  "timeout": 30,
  "verify_ssl": true
}
```

**API Response:**
```json
{
  "users": [
    {
      "id": 1,
      "name": "John Doe"
    }
  ]
}
```

**Result:** The connector will create a file named `response.json` containing the API response data.

### Push Example

**Configuration:**
```json
{
  "url": "https://api.example.com/v1/users",
  "method": "POST",
  "headers": {
    "Authorization": "Bearer <token>"
  },
  "timeout": 30,
  "verify_ssl": true
}
```

**Input File:** `users.json`
```json
{
  "users": [
    {
      "id": 1,
      "name": "John Doe"
    }
  ]
}
```

**Result:** The connector will send the file content as the request body to the configured endpoint with `Content-Type: application/json` header.

## Error Handling

The HTTP connector provides comprehensive error handling:

- **HTTP Status Codes**: Returns detailed error messages for HTTP status codes >= 400
- **Connection Errors**: Handles network timeouts and connection failures
- **Configuration Validation**: Validates required fields and data types
- **SSL Verification**: Configurable SSL certificate verification

## Content Type Support

The connector automatically handles a comprehensive range of content types using the Irmin SDK's hybrid MIME type detection:

### Standard Formats
| Content Type | File Extension | Description |
|--------------|----------------|-------------|
| `application/json` | `.json` | JSON data |
| `application/xml` | `.xml` | XML data |
| `text/html` | `.html` | HTML content |
| `text/plain` | `.txt` | Plain text |
| `text/csv` | `.csv` | CSV data |
| `image/jpeg` | `.jpg` | JPEG images |
| `image/png` | `.png` | PNG images |
| `image/gif` | `.gif` | GIF images |
| `application/pdf` | `.pdf` | PDF documents |

### Advanced Analytics Formats
| Content Type | File Extension | Description |
|--------------|----------------|-------------|
| `application/vnd.apache.parquet` | `.parquet` | Apache Parquet |
| `application/vnd.apache.avro` | `.avro` | Apache Avro |
| `application/vnd.apache.orc` | `.orc` | Apache ORC |
| `application/x-delta-lake` | `.delta` | Delta Lake |
| `application/x-iceberg` | `.iceberg` | Apache Iceberg |

### Structured Data Formats
| Content Type | File Extension | Description |
|--------------|----------------|-------------|
| `application/jsonl` | `.jsonl` | JSON Lines |
| `application/x-ndjson` | `.ndjson` | Newline-delimited JSON |
| `text/tab-separated-values` | `.tsv` | Tab-separated values |
| `application/x-yaml` | `.yaml`, `.yml` | YAML |
| `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | `.xlsx` | Excel (Office Open XML) |
| `application/vnd.ms-excel` | `.xls` | Excel (Legacy) |
| `application/vnd.ms-excel.sheet.macroEnabled.12` | `.xlsm` | Excel with macros |
| `application/vnd.ms-excel.sheet.binary.macroEnabled.12` | `.xlsb` | Excel binary |

### Modern Media Formats
| Content Type | File Extension | Description |
|--------------|----------------|-------------|
| `image/heic` | `.heic` | Apple HEIC format |
| `image/heif` | `.heif` | Apple HEIF format |
| `image/avif` | `.avif` | AV1 Image File Format |
| `image/webp` | `.webp` | WebP format |
| `audio/opus` | `.opus` | Opus audio codec |
| `audio/flac` | `.flac` | FLAC lossless audio |

### Font Formats
| Content Type | File Extension | Description |
|--------------|----------------|-------------|
| `font/woff` | `.woff` | Web Open Font Format |
| `font/woff2` | `.woff2` | Web Open Font Format 2.0 |
| `font/otf` | `.otf` | OpenType Font |
| `font/ttf` | `.ttf` | TrueType Font |

### Archive Formats
| Content Type | File Extension | Description |
|--------------|----------------|-------------|
| `application/zip` | `.zip` | ZIP archive |
| `application/x-tar` | `.tar` | TAR archive |
| `application/gzip` | `.gz` | GZIP compressed file |
| `application/x-bzip2` | `.bz2` | BZIP2 compressed file |
| `application/x-xz` | `.xz` | XZ compressed file |
| `application/x-lz` | `.lz` | LZ compressed file |
| `application/x-lzma` | `.lzma` | LZMA compressed file |
| `application/x-compress` | `.z` | Compress compressed file |
| `application/vnd.rar` | `.rar` | RAR archive |
| `application/x-7z-compressed` | `.7z` | 7-Zip archive |
| `application/vnd.ms-cab-compressed` | `.cab` | CAB archive |
| `application/vnd.debian.binary-package` | `.deb` | Debian package |
| `application/x-rpm` | `.rpm` | RPM package |
| `application/x-apple-diskimage` | `.dmg` | Apple disk image |
| `application/x-iso9660-image` | `.iso` | ISO disk image |
| `application/x-raw-disk-image` | `.img` | Raw disk image |

### Other
| Content Type | File Extension | Description |
|--------------|----------------|-------------|
| `application/javascript` | `.js` | JavaScript |
| Other | `.bin` | Binary content |

## Security Features

- **SSL/TLS Support**: Configurable SSL certificate verification
- **Custom Headers**: Support for authentication headers (Bearer tokens, API keys, etc.)
- **Timeout Configuration**: Configurable request timeouts to prevent hanging connections
- **Input Validation**: Comprehensive validation of configuration parameters