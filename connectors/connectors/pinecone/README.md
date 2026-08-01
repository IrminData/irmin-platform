# Pinecone Connector

The Pinecone connector enables seamless integration with [Pinecone](https://www.pinecone.io), a high-performance vector database. Import and export vector embeddings between Irmin's native `.parquet`-based embedding format and Pinecone indexes.

## Features

- **Pull (Search)**: Perform semantic similarity search and retrieve matching vectors as JSON
- **Pull (Full Export)**: Export all vectors from an index/namespace as Irmin-compatible Parquet files
- **Push**: Upload Irmin embeddings to a Pinecone index

## Configuration

### Connection Details (Required)

| Field | Type | Description |
|-------|------|-------------|
| `api_key` | Secret | Your Pinecone API key from the [Pinecone Console](https://app.pinecone.io) |
| `host` | Text | The host URL for your Pinecone index (e.g., `your-index-abc1234.svc.pinecone.io`) |

### Connection Settings

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `index` | Text | Name of the Pinecone index to connect to | Yes |
| `namespace` | Text | Namespace within the index (leave empty for default namespace) | No |
| `top_k` | Integer | Number of results to return for search queries (default: 10) | No |

## Operations

### Pull Operation

The pull operation supports two modes based on the `path` parameter:

#### Semantic Search (path = query vector as JSON)

When a path is provided, it's interpreted as a query vector for semantic search.

**Input**: JSON array of floats representing the query embedding
```
[0.1, 0.2, 0.3, ...]
```

**Output**: `search-results.json` containing matches with scores:
```json
{
  "query": "[0.1, 0.2, 0.3, ...]",
  "matches": [
    {
      "id": "vec-123",
      "score": 0.95,
      "metadata": {
        "content": "Document content...",
        "source_file": "document.pdf"
      }
    }
  ]
}
```

#### Full Index Export (empty path)

When no path is provided, exports all vectors from the configured index/namespace.

**Output**: `embeddings.parquet` containing all vectors in Irmin's native embedding format:
- `id` - Unique identifier
- `source_file` - Original source file name
- `chunk_index` - Chunk position within source
- `content` - Text content of the chunk
- `embedding` - Vector values as float32 array
- `metadata` - Additional key-value metadata
- `created_at` - Timestamp

### Push Operation

Uploads Irmin embedding files to Pinecone.

**Input**: Parquet files with Irmin embedding schema

**Behavior**:
- Vectors are upserted (inserted or updated if ID exists)
- Batched in groups of 100 for optimal performance
- Metadata fields are preserved

## Capabilities

| Capability | Supported |
|------------|-----------|
| Pull | ✅ |
| Push | ✅ |
| Patch | ❌ |
| Subscribe | ❌ |

## Example Use Cases

1. **Backup Embeddings**: Export embeddings from Pinecone to Irmin for versioned backup and disaster recovery.

2. **Migration**: Move embeddings between Pinecone indexes or from other vector stores via Irmin's universal format.

3. **Hybrid Search Pipeline**: Use Pinecone for production similarity search while maintaining a copy in Irmin for batch processing.

4. **RAG Applications**: Sync document embeddings generated in Irmin workflows to Pinecone for real-time retrieval.

5. **A/B Testing**: Export embeddings, modify them in Irmin workflows, and push to a separate index for comparison.

## Data Format

### Irmin Embedding Record

The connector uses Irmin's standard embedding format:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier for the vector |
| `source_file` | string | Original source file name |
| `chunk_index` | int32 | Position of chunk within source |
| `content` | string | Text content that was embedded |
| `embedding` | []float32 | The vector embedding values |
| `metadata` | map[string]string | Additional metadata key-value pairs |
| `created_at` | timestamp | When the embedding was created |

### Pinecone Vector Mapping

| Irmin Field | Pinecone Field |
|-------------|----------------|
| `id` | Vector ID |
| `embedding` | Vector values |
| `content` | `metadata.content` |
| `source_file` | `metadata.source_file` |
| `chunk_index` | `metadata.chunk_index` |
| `created_at` | `metadata.created_at` |
| `metadata.*` | `metadata.*` |

## Limits

| Limit | Value | Notes |
|-------|-------|-------|
| Upsert batch size | 100 vectors | Pinecone API limit |
| Fetch batch size | 1000 vectors | Per request limit |
| Max `top_k` | 10,000 | Pinecone query limit |
| Vector dimensions | Index-dependent | Must match index configuration |

## Error Handling

The connector handles common errors:
- Invalid API key or host
- Index not found
- Namespace not found
- Dimension mismatch
- Rate limit exceeded
- Network timeouts

Errors are logged to the operation logs with detailed messages.

## Resources

- [Pinecone Documentation](https://docs.pinecone.io)
- [Pinecone API Reference](https://docs.pinecone.io/reference/api/introduction)
- [Pinecone Go SDK](https://github.com/pinecone-io/go-pinecone)
- [Get API Key](https://app.pinecone.io)
