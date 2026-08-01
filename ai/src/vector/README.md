# Vector Services – RAG Implementation

The vector services power Retrieval Augmented Generation (RAG) inside Irmin AI. They provide helpers for managing Qdrant collections, creating embeddings, indexing documents, and retrieving context for LangChain agents.

```
┌──────────────┐      ┌──────────────────┐
│ Source Docs  │      │   User Query     │
└──────┬───────┘      └────────┬─────────┘
       │                       │
       ▼                       │
┌──────────────┐               │
│ IndexingSvc  │               │
│  • Fetch     │               │
│  • Chunk     │               │
│  • Embed     │               │
│  • Upload    │               │
└──────┬───────┘               │
       │                       ▼
       ▼             ┌────────────────────┐
┌──────────────┐    │ RetrievalService   │
│  Qdrant      │◄───┤  • Similarity      │
│  Collection  │    │  • Context build   │
└──────────────┘    │  • Hypothetical    │
                     └─────────┬─────────┘
                               ▼
                     ┌────────────────────┐
                     │  Agent / LLM       │
                     └────────────────────┘
```

## IndexingService

`src/vector/IndexingService.ts`

| Method | Description |
| --- | --- |
| `initVectorStore(collectionName, isSystemCollection?, workspaceSlug?, userId?)` | Connect to an existing Qdrant collection after verifying workspace/user permissions. Throws if access is denied or the collection does not exist. |
| `createNewVectorStore(collectionName, workspaceSlug, userId, description?)` | Creates a new collection (DB + Qdrant). Returns a ready-to-use `QdrantVectorStore`. |
| `indexDocuments(vectorStore, documents, collectionName?)` | Validates records via Zod, uploads them, updates collection stats, and logs analytics. |
| `createEmbeddings(texts, model?)` / `createEmbedding(text, model?)` | Convenience helpers for batch or single embeddings (default `text-embedding-3-small`). |
| `deleteAllDocuments(vectorStore, collectionName?)` | Removes all points from a collection and resets counters. |
| `deleteSpecificChunks(vectorStore, chunkIds, collectionName?)` | Removes chunks by `metadata.documentId`. |
| `deleteDocuments(vectorStore, documentIds, collectionName?)` | Removes all chunk variants for a base document ID. |
| `getEmbeddingModel()` | Returns the underlying `OpenAIEmbeddings` instance for custom workflows. |

### Example: create + index

```typescript
import { indexingService } from '@/vector';

// 1. Create a new collection for a workspace user
const vectorStore = await indexingService.createNewVectorStore(
  'customer-docs',
  workspace.slug,
  user.id,
  'Customer success playbooks'
);

// 2. Index content (metadata is optional)
await indexingService.indexDocuments(vectorStore, [
  {
    pageContent: 'Irmin tracks data versioning through repositories and branches.',
    metadata: { category: 'concepts', documentId: 'concepts-1' },
  },
]);
```

### Example: connect to existing system collection

```typescript
const vectorStore = await indexingService.initVectorStore('irmin-docs', true);
```

`initVectorStore` is used by agents to connect to system collections. The `vectorize-docs` script maintains two system collections:
- `irmin-docs`: Irmin SDK documentation and local LLM documentation (used by all agents via `BaseAgent`)
- `duckdb-sql-syntax-docs`: DuckDB SQL syntax documentation (used by specialized agents like `QueryAgent`)

## RetrievalService

`src/vector/RetrievalService.ts`

| Method | Description |
| --- | --- |
| `searchSimilar(vectorStore, options, collectionName?)` | Similarity search with optional metadata filters and score thresholds. Returns documents, scores, and timing metrics. |
| `retrieveWithAnalysis(vectorStore, analysis, collectionName?)` | Executes an analyzed query structure (filters + window). Useful for advanced search experiences. |
| `retrieveContext(vectorStore, query, options?, collectionName?)` | Builds a context string (with optional metadata blocks) constrained by token estimates. |
| `multiQueryRetrieval(vectorStore, queries, options?, collectionName?)` | Executes multiple queries and optionally deduplicates by content. |
| `retrieveWithCompression(vectorStore, query, options?, collectionName?)` | Filters results by score and truncates content to reduce tokens. |
| `retrieveWithHypotheticalContent(vectorStore, query, options?, collectionName?)` | HyDE-style retrieval: generates hypothetical content using domain-specific prompts and Groq LLMs, falls back to the raw query if generation fails. Returns structured context with source attribution, scores, and granular timing metrics. |

### Example: build RAG context with HyDE

```typescript
import { indexingService, retrievalService } from '@/vector';

const vectorStore = await indexingService.initVectorStore('irmin-docs', true);

const result = await retrievalService.retrieveWithHypotheticalContent(
  vectorStore,
  'How does Irmin handle branching for data pipelines?',
  {
    maxDocuments: 5,
    scoreThreshold: 0.2,
    includeMetadata: true,
    maxTokens: 2000,
  },
  'irmin-docs'
);

// Structured context with source attribution and scores
console.log(result.context);
// === Search Results for: "How does Irmin handle branching..." ===
// [Result 1 - Source: docs/branching.md, Score: 0.892]
// Content here...
// ---
// [Result 2 - Source: docs/pipelines.md, Score: 0.845]
// ...

// Granular timing metrics
console.log(result.metrics);
// { generationTimeMs: 450, searchTimeMs: 120, totalTimeMs: 580 }

// Access sources and metadata
console.log(result.sources.length, result.totalTokens);
console.log(result.usedHypothetical, result.hypotheticalContent);
```

### HyDE Domain-Specific Prompts

The retrieval service uses specialized prompts based on collection name:

| Collection | Prompt Focus |
| --- | --- |
| `duckdb-sql-syntax-docs` | SQL syntax, function signatures, data types, query patterns |
| `irmin-docs` | API endpoints, SDK methods, configuration, integration patterns |
| Default | Generic technical documentation format |

These domain-specific prompts generate richer hypothetical documents that better match the actual documentation structure.

### Example: similarity search with filters

```typescript
const results = await retrievalService.searchSimilar(
  vectorStore,
  {
    query: 'Irmin connectors',
    k: 4,
    filter: { category: 'connectors' },
    scoreThreshold: 0.25,
  },
  'irmin-docs'
);

results.documents.forEach(({ document, score }) => {
  console.log(score.toFixed(3), document.metadata);
});
```

## Putting it together

```typescript
// 1. Connect to a collection (create if needed)
const vectorStore = await indexingService.initVectorStore('irmin-docs', true);

// 2. Retrieve context for a user query
const { context, sources } = await retrievalService.retrieveContext(
  vectorStore,
  'Explain Irmin data versioning best practices',
  {
    maxDocuments: 3,
    scoreThreshold: 0.15,
    includeMetadata: true,
    maxTokens: 1800,
  },
  'irmin-docs'
);

// 3. Pass the context into your LLM chain
// const response = await llm.invoke([...]);
```

## Configuration & environment

Set the following environment variables before using the vector services:

```bash
OPENAI_API_KEY=your_openai_api_key
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=optional_api_key_if_required
```

Agents expect system collections to exist. The `vectorize-docs` script populates both `irmin-docs` and `duckdb-sql-syntax-docs` collections. Run it via `POST /api/system/scripts/vectorize-docs` or `tsx src/scripts/vectorize-docs.ts`.

**Agent context retrieval:**
- `BaseAgent` automatically retrieves context from `irmin-docs` for all agents
- Specialized agents (like `QueryAgent`) can override `prepareContext` to retrieve additional collections (e.g., `duckdb-sql-syntax-docs`)

## Best practices

### Indexing
- Chunk text between ~700–1000 characters with 150–250 overlap (defaults used by the script)
- Use deterministic `metadata.documentId` values when you need replace-mode updates (the script auto-generates them)
- Record relevant metadata (category, source, file path) for better filtering

### Retrieval
- Apply score thresholds to trim irrelevant content (`0.2`–`0.3` works well for most docs)
- Use `retrieveWithHypotheticalContent` by default for better semantic matching
- The structured output format includes source attribution and relevance scores for transparency
- Monitor `metrics.generationTimeMs` to track HyDE overhead (typically 300-600ms)
- Cap `maxTokens` to stay within LLM context limits and avoid flooding prompts with stale data

### Performance
- Cache vector store connections per request when possible (`initVectorStore` reuses the same embeddings client)
- Prefer batch indexing (`indexDocuments`) over multiple single calls
- Monitor analytics events in the `analytics` table to understand document counts and retrieval timings

## Advanced features

- **HyDE retrieval** – `retrieveWithHypotheticalContent` uses domain-specific prompts (SQL docs, Irmin docs, generic) to generate hypothetical documents that improve semantic matching. Returns structured output with:
  - Numbered results with source files and relevance scores
  - Granular timing metrics (`generationTimeMs`, `searchTimeMs`, `totalTimeMs`)
  - Hypothetical content for debugging/inspection
- **Contextual compression** – `retrieveWithCompression` trims low-scoring chunks and shortens content to a defined size.
- **Chunk deletion helpers** – Use `deleteSpecificChunks` or `deleteDocuments` to surgically remove outdated content without dropping entire collections.
