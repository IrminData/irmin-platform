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

`initVectorStore` is used heavily by the assistant agent to connect to the `irmin-docs` system collection that the `vectorize-docs` script maintains.

## RetrievalService

`src/vector/RetrievalService.ts`

| Method | Description |
| --- | --- |
| `searchSimilar(vectorStore, options, collectionName?)` | Similarity search with optional metadata filters and score thresholds. Returns documents, scores, and timing metrics. |
| `retrieveWithAnalysis(vectorStore, analysis, collectionName?)` | Executes an analyzed query structure (filters + window). Useful for advanced search experiences. |
| `retrieveContext(vectorStore, query, options?, collectionName?)` | Builds a context string (with optional metadata blocks) constrained by token estimates. |
| `multiQueryRetrieval(vectorStore, queries, options?, collectionName?)` | Executes multiple queries and optionally deduplicates by content. |
| `retrieveWithCompression(vectorStore, query, options?, collectionName?)` | Filters results by score and truncates content to reduce tokens. |
| `retrieveWithHypotheticalContent(vectorStore, query, options?, collectionName?)` | HyDE-style retrieval: generates hypothetical content using Groq LLMs, falls back to the raw query if generation fails, and returns context + metadata about the hypothetical usage. |

### Example: build RAG context

```typescript
import { indexingService, retrievalService } from '@/vector';

const vectorStore = await indexingService.initVectorStore('irmin-docs', true);

const { context, sources, totalTokens } = await retrievalService.retrieveWithHypotheticalContent(
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

console.log(totalTokens, sources.length, context.slice(0, 200));
```

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

Assistant agents expect the `irmin-docs` system collection to exist. Populate it by running the `vectorize-docs` script (`POST /api/system/scripts/vectorize-docs` or `tsx src/scripts/vectorize-docs.ts`).

## Best practices

### Indexing
- Chunk text between ~700–1000 characters with 150–250 overlap (defaults used by the script)
- Use deterministic `metadata.documentId` values when you need replace-mode updates (the script auto-generates them)
- Record relevant metadata (category, source, file path) for better filtering

### Retrieval
- Apply score thresholds to trim irrelevant content (`0.2`–`0.3` works well for most docs)
- Leverage `retrieveWithHypotheticalContent` when queries are short or ambiguous
- Cap `maxTokens` to stay within LLM context limits and avoid flooding prompts with stale data

### Performance
- Cache vector store connections per request when possible (`initVectorStore` reuses the same embeddings client)
- Prefer batch indexing (`indexDocuments`) over multiple single calls
- Monitor analytics events in the `analytics` table to understand document counts and retrieval timings

## Advanced features

- **HyDE retrieval** – `retrieveWithHypotheticalContent` automatically logs hypothetical usage via the analytics service.
- **Contextual compression** – `retrieveWithCompression` trims low-scoring chunks and shortens content to a defined size.
- **Chunk deletion helpers** – Use `deleteSpecificChunks` or `deleteDocuments` to surgically remove outdated content without dropping entire collections.
