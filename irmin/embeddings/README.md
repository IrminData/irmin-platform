# Embeddings Package

The `embeddings` package provides comprehensive embedding management for Irmin, including embedding creation via OpenAI, storage in Parquet format with DuckDB's vector extension, and efficient vector similarity search capabilities.

## Features

- **Embedding Creation**: Generate embeddings using OpenAI's embedding models (text-embedding-3-small, text-embedding-3-large)
- **Text Extraction**: Extract text from various file formats (TXT, MD, CSV, JSON, JSONL, TSV)
- **Text Chunking**: Split large documents into optimal chunks with configurable overlap (character-based or sentence-based)
- **Parquet Storage**: Store embeddings in columnar Parquet format with DuckDB native array types
- **Vector Search**: Perform similarity search using DuckDB's vss extension with cosine distance
- **Filtered Search**: Search with metadata filtering for targeted results
- **HNSW Indexing**: Create vector indexes for faster search on large datasets
- **LakeFS Integration**: Upload and manage embedding files in LakeFS with proper metadata tracking
- **File Merging**: Merge multiple embedding Parquet files into a single file

## Installation

The package is part of the Irmin core API. Ensure you have the required dependencies:

```bash
go get github.com/openai/openai-go/v3
go get github.com/google/uuid
```

## Core Types

### EmbeddingConfig

```go
type EmbeddingConfig struct {
    Model      string // OpenAI embedding model
    Dimensions int    // Vector dimensions
    ChunkSize  int    // Characters per chunk
    Overlap    int    // Overlap between chunks
}
```

### EmbeddingRecord

```go
type EmbeddingRecord struct {
    ID         string
    SourceFile string
    ChunkIndex int
    Content    string
    Embedding  []float32
    Metadata   map[string]string
    CreatedAt  time.Time
}
```

### EmbeddingResult

```go
type EmbeddingResult struct {
    Records     []EmbeddingRecord
    TotalChunks int
    Model       string
    Dimensions  int
}
```

### SearchResult

```go
type SearchResult struct {
    ID         string
    SourceFile string
    ChunkIndex int
    Content    string
    Score      float64   // Cosine similarity (0-1, higher is better)
    Distance   float64   // Cosine distance (0-2, lower is better)
    Metadata   map[string]string
}
```

### UploadConfig

```go
type UploadConfig struct {
    RepositoryID string
    Branch       string
    Path         string
    SourceFile   string
    Model        string
    Dimensions   int
    ChunkCount   int
}
```

## Usage

### Creating a Client

```go
import (
    "irmin-api/embeddings"
    "irmin-api/utils"
    "log/slog"
)

// Load environment and create logger
env, _ := utils.LoadEnv()
logger := slog.Default()

// Create embeddings client
client, err := embeddings.NewClient(ctx, env, logger, lakeFSClient)
if err != nil {
    log.Fatal(err)
}
defer client.Close()
```

### Generating Embeddings

```go
// Generate embeddings for multiple texts
texts := []string{
    "The quick brown fox jumps over the lazy dog.",
    "Machine learning is transforming technology.",
}

config := embeddings.EmbeddingConfig{
    Model:      "text-embedding-3-small",
    Dimensions: 1536,
}

vectors, err := client.CreateEmbeddings(ctx, texts, config)
if err != nil {
    log.Fatal(err)
}

// Generate embedding for a single query
queryVector, err := client.CreateEmbeddingForQuery(ctx, "What is AI?", config)
```

### Processing Files

```go
// Extract text, chunk, and create embeddings from a file
fileContent, _ := os.ReadFile("document.txt")

config := embeddings.EmbeddingConfig{
    Model:      "text-embedding-3-small",
    Dimensions: 1536,
    ChunkSize:  1000,
    Overlap:    200,
}

result, err := client.CreateEmbeddingsFromFile(ctx, fileContent, "document.txt", config)
if err != nil {
    log.Fatal(err)
}

fmt.Printf("Created %d embedding chunks\n", result.TotalChunks)
```

### Saving to Parquet

```go
// Save embeddings to a Parquet file
err := client.SaveEmbeddingsToParquet(ctx, result.Records, "/path/to/embeddings.parquet")

// Or get Parquet data as bytes
parquetData, err := client.SaveEmbeddingsToParquetBytes(ctx, result.Records)
```

### Vector Similarity Search

```go
// Search for similar embeddings using a query vector
queryVector, _ := client.CreateEmbeddingForQuery(ctx, "machine learning", config)

results, err := client.SearchSimilar(ctx, queryVector, "/path/to/embeddings.parquet", 10)
if err != nil {
    log.Fatal(err)
}

for _, result := range results {
    fmt.Printf("Score: %.4f Distance: %.4f - %s\n", result.Score, result.Distance, result.Content)
}

// Or search directly with text (generates embedding automatically)
results, err := client.SearchByText(ctx, "machine learning", "/path/to/embeddings.parquet", 10, config)

// Search from in-memory Parquet bytes
parquetData, _ := os.ReadFile("embeddings.parquet")
results, err = client.SearchSimilarFromBytes(ctx, queryVector, parquetData, 10)

// Search with metadata filtering
filter := map[string]string{
    "category": "technical",
    "language": "en",
}
results, err = client.SearchWithFilter(ctx, queryVector, "/path/to/embeddings.parquet", 10, filter)
```

### Loading and Counting Embeddings

```go
// Load all embeddings from a Parquet file
records, err := client.LoadEmbeddingsFromParquet(ctx, "/path/to/embeddings.parquet")
if err != nil {
    log.Fatal(err)
}
fmt.Printf("Loaded %d embedding records\n", len(records))

// Get count without loading all records
count, err := client.GetEmbeddingCount(ctx, "/path/to/embeddings.parquet")
fmt.Printf("Total embeddings: %d\n", count)
```

### Merging Embedding Files

```go
// Merge multiple Parquet embedding files into one
inputFiles := []string{
    "/path/to/embeddings1.parquet",
    "/path/to/embeddings2.parquet",
    "/path/to/embeddings3.parquet",
}

err := client.MergeParquetFiles(ctx, inputFiles, "/path/to/merged_embeddings.parquet")
```

### Creating Vector Indexes

```go
// Create an HNSW index for faster search on large datasets
err := client.CreateVectorIndex(ctx, "/path/to/embeddings.parquet", "my_index")
if err != nil {
    log.Fatal(err)
}
// Note: The index is created in-memory in the DuckDB session
```

### LakeFS Integration

```go
// Process file and upload embeddings to LakeFS (all-in-one convenience method)
result, metadata, err := client.ProcessAndUploadFile(
    ctx,
    fileContent,
    "document.txt",
    "my-repository",
    "main",
    "embeddings/document_embeddings.parquet",
    config,
)

// Or manually upload Parquet bytes
parquetData, _ := client.SaveEmbeddingsToParquetBytes(ctx, result.Records)
uploadConfig := embeddings.UploadConfig{
    RepositoryID: "my-repository",
    Branch:       "main",
    Path:         "embeddings/custom_embeddings.parquet",
    SourceFile:   "document.txt",
    Model:        config.Model,
    Dimensions:   config.Dimensions,
    ChunkCount:   len(result.Records),
}
metadata, err := client.UploadToLakeFS(ctx, uploadConfig, parquetData)

// Download embedding file from LakeFS
embeddingData, err := client.DownloadFromLakeFS(ctx, "my-repository", "main", "embeddings/document_embeddings.parquet")

// List all embedding files in a repository path
embeddingFiles, err := client.ListEmbeddingFiles(ctx, "my-repository", "main", "embeddings/")
for _, file := range embeddingFiles {
    fmt.Printf("File: %s\n", file.Path)
    if embeddings.IsEmbeddingFile(file.Metadata) {
        model, dimensions, sourceFile := embeddings.GetEmbeddingMetadata(file.Metadata)
        fmt.Printf("  Model: %s, Dimensions: %d, Source: %s\n", model, dimensions, sourceFile)
    }
}

// Delete an embedding file
err = client.DeleteEmbeddingFile(ctx, "my-repository", "main", "embeddings/old_embeddings.parquet")
```

### Text Chunking Strategies

```go
// Character-based chunking with overlap (default)
chunks := embeddings.ChunkText(text, 1000, 200)

// Sentence-based chunking for more semantic coherence
chunks := embeddings.ChunkTextBySentences(text, 1000)
// This respects sentence boundaries and provides better context
```

### Format-Specific Text Extraction

The embeddings package supports a wide variety of document formats with intelligent text extraction:

#### Structured Data Formats

For structured formats (CSV, JSON, Parquet, Excel), the package extracts and concatenates all text fields:

```go
// Parquet files - efficient columnar format
fileContent, _ := os.ReadFile("analytics.parquet")
result, err := client.CreateEmbeddingsFromFile(ctx, fileContent, "analytics.parquet", config)
// Extracts and embeds all text columns from the Parquet file

// Excel spreadsheets - pure Go implementation
fileContent, _ := os.ReadFile("report.xlsx")
result, err := client.CreateEmbeddingsFromFile(ctx, fileContent, "report.xlsx", config)
// Extracts text from all cells across all sheets using Excelize

// CSV files with multiple text columns
fileContent, _ := os.ReadFile("products.csv")
result, err := client.CreateEmbeddingsFromFile(ctx, fileContent, "products.csv", config)
// Concatenates all columns: "ProductName Category Description Features"
```

#### Markup and Configuration Formats

XML and YAML files are parsed and text content is extracted recursively:

```go
// XML documents
fileContent, _ := os.ReadFile("documentation.xml")
result, err := client.CreateEmbeddingsFromFile(ctx, fileContent, "documentation.xml", config)
// Recursively extracts all text nodes while preserving structure

// YAML configuration files
fileContent, _ := os.ReadFile("config.yaml")
result, err := client.CreateEmbeddingsFromFile(ctx, fileContent, "config.yaml", config)
// Extracts all string values from the YAML hierarchy
```

#### Document Formats

PDF and Word documents are handled by pure Go libraries with no external dependencies:

```go
// PDF documents - pure Go implementation
fileContent, _ := os.ReadFile("whitepaper.pdf")
result, err := client.CreateEmbeddingsFromFile(ctx, fileContent, "whitepaper.pdf", config)
if err != nil {
    log.Fatal(err)
}

// Word DOCX documents - pure Go implementation
fileContent, _ := os.ReadFile("proposal.docx")
result, err := client.CreateEmbeddingsFromFile(ctx, fileContent, "proposal.docx", config)
// Extracts all text content from the Word document
```

#### Error Handling for Format-Specific Issues

```go
result, err := client.CreateEmbeddingsFromFile(ctx, fileContent, fileName, config)
if err != nil {
    switch {
    case strings.Contains(err.Error(), "unsupported file format"):
        // File format not supported
        fmt.Println("File format not supported for embeddings")
    case strings.Contains(err.Error(), "failed to open PDF"):
        // Invalid or corrupted PDF file
        fmt.Println("Could not read PDF file")
    case strings.Contains(err.Error(), "failed to open DOCX"):
        // Invalid or corrupted DOCX file
        fmt.Println("Could not read DOCX file")
    default:
        log.Fatal(err)
    }
}
```

### Utility Functions

```go
// Check if a file format is supported
if embeddings.IsSupportedFormat("document.pdf") {
    // Process file
}

// Get list of all supported formats
formats := embeddings.GetSupportedFormats()
fmt.Printf("Supported: %v\n", formats)
// Output: [.txt .md .csv .json .jsonl .ndjson .tsv .tab .parquet .xlsx .xlsm .xml .yaml .yml .pdf .docx]

// Manually compute cosine similarity between vectors
similarity, err := embeddings.ComputeCosineSimilarity(vector1, vector2)
fmt.Printf("Similarity: %.4f\n", similarity)
```

## Configuration

### EmbeddingConfig Defaults

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `Model` | string | `text-embedding-3-small` | OpenAI embedding model |
| `Dimensions` | int | `1536` | Vector dimensions |
| `ChunkSize` | int | `1000` | Characters per chunk (rune-based) |
| `Overlap` | int | `200` | Overlap between chunks |

```go
// Get default configuration
config := embeddings.DefaultConfig()

// Or customize
config := embeddings.EmbeddingConfig{
    Model:      "text-embedding-3-large",
    Dimensions: 3072,
    ChunkSize:  1500,
    Overlap:    300,
}
```

### Supported Models

| Model | Max Dimensions | Default Dimensions | Best For |
|-------|---------------|-------------------|----------|
| `text-embedding-3-small` | 1536 | 1536 | Cost-effective, general use |
| `text-embedding-3-large` | 3072 | 3072 | Higher accuracy, specialized tasks |

## Supported File Formats

| Format | Extensions | Extraction Method |
|--------|-----------|-------------------|
| Plain Text | `.txt`, `.md` | Direct read |
| CSV | `.csv` | DuckDB query |
| JSON | `.json` | DuckDB query |
| JSONL | `.jsonl`, `.ndjson` | DuckDB query |
| TSV | `.tsv`, `.tab` | DuckDB query |
| Parquet | `.parquet` | DuckDB query |
| Excel | `.xlsx`, `.xlsm` | Excelize library (pure Go) |
| XML | `.xml` | Go encoding/xml parser |
| YAML | `.yaml`, `.yml` | gopkg.in/yaml.v3 parser |
| PDF | `.pdf` | ledongthuc/pdf library (pure Go) |
| Word | `.docx` | nguyenthenguyen/docx library (pure Go) |

### External Dependencies

All file formats are handled by pure Go libraries with **no external dependencies required**.

- **PDF files**: Uses `github.com/ledongthuc/pdf` - pure Go PDF text extraction
- **Word DOCX files**: Uses `github.com/nguyenthenguyen/docx` - pure Go DOCX reader
- **Excel files**: Uses `github.com/xuri/excelize/v2` - pure Go Excel library

## Parquet Schema

Embeddings are stored with the following schema:

```sql
CREATE TABLE embeddings (
    id VARCHAR,              -- Unique UUID for each embedding
    source_file VARCHAR,     -- Original source file name
    chunk_index INTEGER,     -- Sequential chunk number
    content TEXT,            -- The actual text content
    embedding FLOAT[N],      -- Native DuckDB array (N = dimensions)
    metadata JSON,           -- Custom metadata as JSON object
    created_at TIMESTAMP     -- Creation timestamp
);
```

Notes:
- The `embedding` column uses DuckDB's native fixed-size array type (e.g., `FLOAT[1536]`)
- Parquet files are compressed with ZSTD for efficient storage
- The schema supports batch insertion for performance

## LakeFS Metadata

Embedding files uploaded to LakeFS are tagged with the following metadata:

| Key | Example Value | Description |
|-----|--------------|-------------|
| `irmin-file-type` | `embeddings` | Identifies file as an embeddings file |
| `irmin-embedding-model` | `text-embedding-3-small` | The OpenAI model used |
| `irmin-embedding-dimensions` | `1536` | Vector dimensions |
| `irmin-source-file` | `document.txt` | Original source file name |
| `irmin-chunk-count` | `42` | Number of embedding chunks |

Use `IsEmbeddingFile()` and `GetEmbeddingMetadata()` to work with these metadata tags.

## API Methods Summary

### Core Embedding Operations
- `NewClient()` - Create embeddings client
- `Close()` - Release resources
- `CreateEmbeddings()` - Generate embeddings for texts
- `CreateEmbeddingForQuery()` - Generate single embedding for query
- `CreateEmbeddingsFromFile()` - Extract text, chunk, and embed file

### Parquet Operations
- `SaveEmbeddingsToParquet()` - Save to Parquet file
- `SaveEmbeddingsToParquetBytes()` - Get Parquet as bytes
- `LoadEmbeddingsFromParquet()` - Load embeddings from file
- `GetEmbeddingCount()` - Count embeddings in file
- `MergeParquetFiles()` - Merge multiple Parquet files

### Search Operations
- `SearchSimilar()` - Vector similarity search
- `SearchByText()` - Search using text query
- `SearchSimilarFromBytes()` - Search from in-memory Parquet
- `SearchWithFilter()` - Search with metadata filtering
- `CreateVectorIndex()` - Create HNSW index for faster search
- `ComputeCosineSimilarity()` - Manual similarity calculation

### LakeFS Operations
- `UploadToLakeFS()` - Upload Parquet to LakeFS
- `DownloadFromLakeFS()` - Download from LakeFS
- `ListEmbeddingFiles()` - List embedding files in path
- `ProcessAndUploadFile()` - All-in-one process and upload
- `DeleteEmbeddingFile()` - Delete from LakeFS
- `IsEmbeddingFile()` - Check if file is an embedding file
- `GetEmbeddingMetadata()` - Extract embedding metadata

### Text Processing
- `ExtractTextFromFile()` - Extract text from various formats
- `ChunkText()` - Character-based chunking with overlap
- `ChunkTextBySentences()` - Sentence-based semantic chunking
- `GetSupportedFormats()` - Get list of supported formats
- `IsSupportedFormat()` - Check if format is supported

## Testing

```bash
cd irmin
go test ./embeddings/... -v

# Run specific test
go test ./embeddings/... -v -run TestSearchSimilar

# Run with coverage
go test ./embeddings/... -cover
```

## Dependencies

- `github.com/openai/openai-go/v3` - OpenAI API client (v3)
- `github.com/google/uuid` - UUID generation
- `github.com/ledongthuc/pdf` - Pure Go PDF text extraction
- `github.com/nguyenthenguyen/docx` - Pure Go DOCX reader
- `github.com/xuri/excelize/v2` - Pure Go Excel library
- `irmin-api/duckdb` - DuckDB query client
- `irmin-api/lakefs` - LakeFS client
- DuckDB `vss` extension - Vector similarity search (auto-installed)

