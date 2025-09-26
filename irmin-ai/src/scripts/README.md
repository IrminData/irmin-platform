# Scripts

This directory contains system scripts that can be executed manually or scheduled in the future. Scripts are simple executable functions with hardcoded configurations.

## Available Scripts

### Vectorize Docs Script

Fetches and vectorizes documentation from URLs and local files into a vector collection. Uses default configuration with hardcoded URLs and local file paths.

**Default Configuration**:
- Collection Name: `irmin-docs`
- URLs: 
  - https://raw.githubusercontent.com/IrminData/irmin-sdk-go/refs/heads/development/docs/docs.md (Go SDK docs)
  - https://raw.githubusercontent.com/IrminData/irmin-sdk-go/refs/heads/development/README.md (Go SDK README)
- Local Files:
  - `llm-docs/concepts.md` (Irmin core concepts)
  - `llm-docs/workflows.md` (Workflow documentation)
  - `llm-docs/connections.md` (Connector documentation)
  - `llm-docs/object-schema.md` (Object schema documentation)
  - `llm-docs/scripting.md` (Scripting documentation)
  - `llm-docs/sql.md` (SQL documentation)
- Chunk Size: 1000 characters
- Chunk Overlap: 200 characters
- Max Concurrent: 3 requests

**Execution Methods**:

1. **API Endpoint**: `POST /api/system/scripts/vectorize-docs`
   ```bash
   curl -X POST http://localhost:3000/api/system/scripts/vectorize-docs \
     -H "Authorization: Bearer YOUR_SYSTEM_TOKEN"
   ```

2. **Programmatic**: 
   ```typescript
   import { vectorizeDocsScript } from '@/scripts';
   
   const result = await vectorizeDocsScript();
   console.log(result);
   ```

**Example Response**:
```json
{
  "success": true,
  "message": "Successfully vectorized 8 documents into 245 chunks and removed 0 old documents",
  "data": {
    "collectionId": "collection-uuid",
    "documentsProcessed": 8,
    "chunksCreated": 245,
    "urlsProcessed": 2,
    "localFilesProcessed": 6,
    "replaceMode": true,
    "oldDocumentsRemoved": 0
  },
  "executionTime": 3682,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Future Enhancements

- Scheduling system for automated script execution
- Script execution history and monitoring
- Additional scripts for data processing and maintenance
- Script configuration management
