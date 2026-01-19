# Native Embeddings in Irmin

Irmin provides native embedding capabilities that allow you to create, store, search, and manage vector embeddings directly within your data repositories. Embeddings are stored in a versioned, columnar format alongside your other data objects, enabling powerful semantic search and AI-powered applications.

## Overview

Native embeddings in Irmin enable:

- **Generate embeddings** from repository objects using OpenAI's embedding models
- **Store embeddings** in a versioned, columnar Parquet format within repositories
- **Search embeddings** using vector similarity (cosine distance) powered by DuckDB's VSS extension
- **Sync embeddings** with external vector databases via connectors (e.g., Pinecone)

### Architecture Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐     ┌──────────────┐
│  Source Files   │────▶│  Text Extraction │────▶│  Chunking   │────▶│  OpenAI API  │
│  (.txt, .pdf,   │     │  (DuckDB, pure   │     │  (char or   │     │  (embedding  │
│   .csv, etc.)   │     │   Go parsers)    │     │  sentence)  │     │   creation)  │
└─────────────────┘     └──────────────────┘     └─────────────┘     └──────┬───────┘
                                                                            │
                        ┌──────────────────────────────────────────────────┘
                        ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────────────────┐
│  Parquet File   │────▶│  LakeFS Storage  │────▶│  Vector Search (DuckDB VSS)     │
│  (ZSTD compress)│     │  (versioned)     │     │  or External DB (via Connector) │
└─────────────────┘     └──────────────────┘     └─────────────────────────────────┘
```

## Storage Format

### Parquet Schema

Embeddings are stored as **Parquet files** with ZSTD compression. The schema is:

```sql
CREATE TABLE embeddings (
    id VARCHAR,              -- Unique UUID for each embedding chunk
    source_file VARCHAR,     -- Original source file path
    chunk_index INTEGER,     -- Sequential chunk number within the source
    content TEXT,            -- The actual text content that was embedded
    embedding FLOAT[N],      -- Native DuckDB array (N = dimensions, e.g., 1536)
    metadata JSON,           -- Custom metadata key-value pairs
    created_at TIMESTAMP     -- When the embedding was created
);
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | VARCHAR | Unique UUID for each embedding chunk |
| `source_file` | VARCHAR | Original source file path |
| `chunk_index` | INTEGER | Sequential chunk number within the source |
| `content` | TEXT | The actual text content that was embedded |
| `embedding` | FLOAT[N] | Native DuckDB array (N = dimensions) |
| `metadata` | JSON | Custom metadata key-value pairs |
| `created_at` | TIMESTAMP | When the embedding was created |

### LakeFS Metadata

Embedding files uploaded to LakeFS are tagged with metadata for identification and tracking:

| Metadata Key | Example Value | Description |
|--------------|---------------|-------------|
| `irmin-file-type` | `embeddings` | Identifies file as an embeddings file |
| `irmin-embedding-model` | `text-embedding-3-small` | The OpenAI model used |
| `irmin-embedding-dimensions` | `1536` | Vector dimensions |
| `irmin-source-file` | `["doc.pdf", "notes.txt"]` | JSON array of source files |
| `irmin-chunk-count` | `42` | Number of embedding chunks |

## Supported File Formats

Irmin can extract text and create embeddings from a wide variety of file formats:

| Category | Extensions | Extraction Method |
|----------|------------|-------------------|
| Plain Text | `.txt`, `.md` | Direct read |
| Structured Data | `.csv`, `.json`, `.jsonl`, `.ndjson`, `.tsv`, `.tab` | DuckDB query |
| Columnar | `.parquet` | DuckDB query |
| Spreadsheets | `.xlsx`, `.xlsm` | Excelize library (pure Go) |
| Documents | `.pdf` | ledongthuc/pdf (pure Go) |
| Documents | `.docx` | nguyenthenguyen/docx (pure Go) |
| Markup | `.xml` | Go encoding/xml parser |
| Configuration | `.yaml`, `.yml` | gopkg.in/yaml.v3 parser |

All file formats are handled by **pure Go libraries** with no external dependencies required.

## Configuration

### Default Settings

| Setting | Default Value | Description |
|---------|---------------|-------------|
| Model | `text-embedding-3-small` | OpenAI embedding model |
| Dimensions | `1536` | Vector dimensions |
| Chunk Size | `1000` characters | Characters per chunk (rune-based) |
| Overlap | `200` characters | Overlap between consecutive chunks |

### Available Models

| Model | Max Dimensions | Default Dimensions | Best For |
|-------|----------------|-------------------|----------|
| `text-embedding-3-small` | 1536 | 1536 | Cost-effective, general use |
| `text-embedding-3-large` | 3072 | 3072 | Higher accuracy, specialized tasks |

### Custom Configuration

When creating embeddings via the API, you can override defaults:

```json
{
  "source_paths": ["documents/report.pdf", "data/analysis.csv"],
  "output_path": "embeddings/combined.parquet",
  "config": {
    "model": "text-embedding-3-large",
    "dimensions": 3072,
    "chunk_size": 1500,
    "overlap": 300
  }
}
```

## API Endpoints

### Vectorize Objects

Create embeddings from one or more repository objects.

```
POST /api/v1/workspaces/{workspace_slug}/repositories/{repository_slug}/embeddings/vectorize
```

**Request Body:**
```json
{
  "source_paths": ["documents/file1.pdf", "documents/file2.txt"],
  "output_path": "embeddings/documents.parquet",
  "ref": "main",
  "config": {
    "model": "text-embedding-3-small",
    "dimensions": 1536,
    "chunk_size": 1000,
    "overlap": 200
  }
}
```

**Response:**
```json
{
  "message": "Embeddings created successfully",
  "data": {
    "path": "embeddings/documents.parquet",
    "source_files": ["documents/file1.pdf", "documents/file2.txt"],
    "model": "text-embedding-3-small",
    "dimensions": 1536,
    "chunk_count": 42,
    "size_bytes": 156789,
    "ref": "main"
  }
}
```

### Search Embeddings

Perform vector similarity search on an embedding file.

```
POST /api/v1/workspaces/{workspace_slug}/repositories/{repository_slug}/embeddings/search
```

**Request Body:**
```json
{
  "query": "What are the key findings about climate change?",
  "embedding_path": "embeddings/documents.parquet",
  "ref": "main",
  "top_k": 10,
  "filter": {
    "category": "research",
    "language": "en"
  }
}
```

**Response:**
```json
{
  "data": {
    "results": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "content": "The study found significant temperature increases...",
        "source_file": "documents/climate-report.pdf",
        "chunk_index": 15,
        "score": 0.89,
        "distance": 0.11,
        "metadata": {"category": "research"}
      }
    ],
    "query": "What are the key findings about climate change?",
    "model": "text-embedding-3-small",
    "top_k": 10
  }
}
```

### List Embedding Files

List all embedding files in a repository path.

```
GET /api/v1/workspaces/{workspace_slug}/repositories/{repository_slug}/embeddings?prefix=embeddings/&ref=main
```

**Response:**
```json
{
  "data": [
    {
      "path": "embeddings/documents.parquet",
      "source_files": ["documents/file1.pdf"],
      "model": "text-embedding-3-small",
      "dimensions": 1536,
      "chunk_count": 42,
      "size_bytes": 156789,
      "ref": "main"
    }
  ]
}
```

### Get Embedding Info

Get metadata about a specific embedding file.

```
GET /api/v1/workspaces/{workspace_slug}/repositories/{repository_slug}/embeddings/info?embedding_path=embeddings/documents.parquet&ref=main
```

## Text Chunking Strategies

### Character-Based Chunking (Default)

Splits text into chunks of a specified character size with overlap:

- **Chunk Size**: Number of characters per chunk (default: 1000)
- **Overlap**: Characters shared between consecutive chunks (default: 200)
- Uses rune-based counting for proper Unicode handling

```
Document: "The quick brown fox jumps over the lazy dog..."

Chunk 1: "The quick brown fox jumps..." (chars 0-1000)
Chunk 2: "...fox jumps over the lazy..." (chars 800-1800, 200 char overlap)
Chunk 3: "...the lazy dog..." (chars 1600-2600, 200 char overlap)
```

### Sentence-Based Chunking

Splits text at sentence boundaries for more semantically coherent chunks:

- Respects sentence endings (`.`, `!`, `?`)
- Combines sentences until reaching max chunk size
- Provides better context for semantic search

## Vector Search

### How Search Works

1. **Query Embedding**: Your search query is converted to a vector using the same model that created the embeddings
2. **Distance Calculation**: DuckDB's VSS extension calculates cosine distance between the query vector and all stored embeddings
3. **Ranking**: Results are ranked by similarity (lower distance = more similar)
4. **Filtering**: Optional metadata filters are applied to narrow results

### Similarity Metrics

| Metric | Range | Interpretation |
|--------|-------|----------------|
| **Score** | 0 to 1 | Higher is better (1 - distance) |
| **Distance** | 0 to 2 | Lower is better (cosine distance) |

### Filtered Search

You can filter results by metadata fields stored in the embedding records:

```json
{
  "query": "revenue projections",
  "embedding_path": "embeddings/financials.parquet",
  "top_k": 5,
  "filter": {
    "department": "finance",
    "year": "2024"
  }
}
```

## Vector Database Integration

### Overview

Irmin embeddings can be synchronized with external vector databases through connectors. This enables:

- **Hybrid architectures**: Use Irmin for versioned storage and external DBs for production serving
- **Migration**: Move embeddings between systems
- **Backup**: Version-controlled backups of vector data

### Supported Connectors

| Connector | Pull (Import) | Push (Export) | Description |
|-----------|---------------|---------------|-------------|
| **Pinecone** | ✅ | ✅ | High-performance vector database |

### Pinecone Integration

#### Push (Export to Pinecone)

Upload Irmin embedding files to a Pinecone index:

1. Parquet files are parsed to extract embedding records
2. Records are upserted to Pinecone in batches of 100
3. Metadata is preserved during transfer

#### Pull (Import from Pinecone)

Import vectors from Pinecone to Irmin:

- **Full Export**: Fetches all vectors and saves as `embeddings.parquet`
- **Search**: Provide a query vector to get search results as JSON

#### Data Mapping

| Irmin Field | Pinecone Field |
|-------------|----------------|
| `id` | Vector ID |
| `embedding` | Vector values |
| `content` | `metadata.content` |
| `source_file` | `metadata.source_file` |
| `chunk_index` | `metadata.chunk_index` |
| `created_at` | `metadata.created_at` |
| `metadata.*` | `metadata.*` |

## AI Application Integration

### Embedding Search in AI Apps

AI Applications can use embeddings for RAG (Retrieval-Augmented Generation):

```
POST /api/v1/ai-app/embeddings/search
```

**Request:**
```json
{
  "query": "How do I reset my password?",
  "path": "/support-docs/main/embeddings/faq.parquet",
  "top_k": 5
}
```

This endpoint:
- Validates the path is within configured data sources
- Performs vector search
- Returns relevant context for LLM prompting

### Custom Embedding Search Tools

AI Applications can define custom tools that wrap embedding searches:

```json
{
  "name": "search_knowledge_base",
  "type": "embedding_search",
  "description": "Search the company knowledge base",
  "config": {
    "embedding_path": "/docs/main/embeddings/knowledge.parquet"
  }
}
```

## Developer Usage

### Core Types

```go
type EmbeddingConfig struct {
    Model      string // OpenAI embedding model
    Dimensions int    // Vector dimensions
    ChunkSize  int    // Characters per chunk
    Overlap    int    // Overlap between chunks
}

type EmbeddingRecord struct {
    ID         string
    SourceFile string
    ChunkIndex int
    Content    string
    Embedding  []float32
    Metadata   map[string]string
    CreatedAt  time.Time
}

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

### Go Client Usage Examples

#### Creating a Client

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

#### Processing Files

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

#### Vector Similarity Search

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
```

## Best Practices

### Choosing Chunk Size

| Use Case | Recommended Chunk Size | Overlap |
|----------|----------------------|---------|
| Q&A / FAQ | 500-800 chars | 100-150 |
| Long documents | 1000-1500 chars | 200-300 |
| Code documentation | 800-1200 chars | 150-200 |
| Research papers | 1500-2000 chars | 300-400 |

### Organizing Embedding Files

```
repository/
├── documents/           # Source documents
│   ├── reports/
│   └── manuals/
├── embeddings/          # Embedding files
│   ├── reports.parquet  # Embeddings for reports/
│   ├── manuals.parquet  # Embeddings for manuals/
│   └── all.parquet      # Combined embeddings
└── ...
```

### Performance Tips

1. **Batch source files**: Combine related files into single embedding files to reduce search overhead
2. **Use appropriate chunk sizes**: Smaller chunks = more precise matches, larger chunks = more context
3. **Add metadata**: Tag chunks with categories, dates, or other fields for filtered search
4. **Version your embeddings**: Use branches to maintain different embedding versions

### When to Re-embed

Re-create embeddings when:
- Source documents are updated
- Chunk size/overlap settings need adjustment
- Switching to a different embedding model
- Adding new metadata fields

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Empty search results | Query too specific | Try broader search terms |
| Low relevance scores | Chunk size too large | Reduce chunk size |
| Missing chunks | File format not supported | Check supported formats |
| Dimension mismatch | Mixed models | Use consistent model for all files |

### Verifying Embeddings

Use the embedding info endpoint to verify:

```bash
GET /embeddings/info?embedding_path=embeddings/docs.parquet
```

Check that:
- `chunk_count` matches expected number of chunks
- `model` and `dimensions` are correct
- `source_files` lists all expected inputs

## Dependencies

- `github.com/openai/openai-go/v3` - OpenAI API client (v3)
- `github.com/google/uuid` - UUID generation
- `github.com/ledongthuc/pdf` - Pure Go PDF text extraction
- `github.com/nguyenthenguyen/docx` - Pure Go DOCX reader
- `github.com/xuri/excelize/v2` - Pure Go Excel library
- `irmin-api/duckdb` - DuckDB query client
- `irmin-api/lakefs` - LakeFS client
- DuckDB `vss` extension - Vector similarity search (auto-installed)

## Related Documentation

- [Pinecone Connector](../../irmin-connectors/connectors/pinecone/README.md) - Vector DB integration
- [AI Applications](./ai-applications.md) - Using embeddings in AI apps
