# System Scripts

This directory houses operational scripts that can be executed through the API, via `tsx`, or programmatically. Scripts are self-contained and ship with sensible defaults so they can run without extra configuration.

## Available scripts

### `vectorize-docs`

Fetches Irmin documentation from remote sources and local markdown files, chunks the content, generates embeddings, and uploads vectors to the `irmin-docs` collection in Qdrant. Supports replace mode (default) that swaps old chunks with new ones in a single run.

**Default configuration**
- Collection name: `irmin-docs`
- Remote URLs:
  - `https://raw.githubusercontent.com/IrminData/irmin-sdk-go/refs/heads/development/README.md`
  - `https://raw.githubusercontent.com/IrminData/irmin-sdk-go/refs/heads/development/docs/docs.md`
- Local files:
  - `llm-docs/concepts.md`
  - `llm-docs/workflows.md`
  - `llm-docs/connections.md`
  - `llm-docs/object-schema.md`
  - `llm-docs/scripting.md`
  - `llm-docs/sql.md`
- Chunk size: 700 characters
- Chunk overlap: 200 characters
- Max concurrent fetches: 3
- Replace mode: `true` (remove previously indexed chunks after successful upload)

**Execution methods**

1. **API (system scope)**
   ```bash
   curl -X POST http://localhost:3000/api/system/scripts/vectorize-docs \
     -H "Authorization: Bearer <system-token>"
   ```

2. **Programmatic**
   ```typescript
   import { vectorizeDocsScript } from '@/scripts';

   const result = await vectorizeDocsScript();
   console.log(result.message);
   ```

3. **Custom configuration**
   ```typescript
   import { VectorizeDocsScript } from '@/scripts/vectorize-docs';

   const script = new VectorizeDocsScript({
     collectionName: 'engineering-notes',
     chunkSize: 900,
     chunkOverlap: 150,
     maxConcurrent: 4,
     urls: ['https://example.com/notes.html'],
     localPaths: ['docs/internal.md'],
     replaceMode: false,
   });

   const result = await script.execute();
   ```

**Response shape**
```json
{
  "success": true,
  "message": "Successfully vectorized 8 documents into 240 chunks and removed 180 of 180 old chunks",
  "data": {
    "documentsProcessed": 8,
    "chunksCreated": 240,
    "urlsProcessed": 2,
    "localFilesProcessed": 6,
    "replaceMode": true,
    "oldChunksRemoved": 180,
    "oldChunksAttempted": 180
  },
  "executionTime": 3620,
  "timestamp": "2025-01-05T10:30:00.000Z"
}
```

Errors are returned with `success: false`, `message`, `error`, and instrumentation details to help diagnose failures.

## How replace mode works

1. Collect existing chunk IDs from Qdrant before indexing (batched scroll queries)
2. Index new content (remote + local)
3. Remove the previously recorded chunk IDs if indexing succeeded

Switch to append mode by setting `replaceMode: false` when constructing `VectorizeDocsScript`.

## Analytics

Every execution logs events via `analyticsService`:
- `vector_store_created` / `vector_store_connection`
- `documents_indexed`, `documents_deleted`
- `script_vectorize_docs`

Use these events to monitor processing time, document counts, and error rates.
