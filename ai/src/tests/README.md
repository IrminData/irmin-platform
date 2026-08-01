# Irmin AI Test Suite

The `src/tests` directory contains executable TypeScript utilities that exercise the Irmin AI API end-to-end. They are designed to run against a live Fastify instance and rely on the same authentication/workspace headers as production clients.

## Prerequisites

1. **Environment variables** (add to `.env` or export before running):
```bash
   TEST_IRMIN_AUTH_TOKEN=<jwt with agent access>
   TEST_WORKSPACE_SLUG=<workspace-slug>
   IRMIN_API_BASE_URL=http://localhost:3000
   DATABASE_URL=postgres://...
   OPENAI_API_KEY=...
   GROQ_API_KEY=...
   ANTHROPIC_API_KEY=...
   QDRANT_URL=http://localhost:6333
   ```
2. **Services running**:
   - Irmin AI Fastify server (`pnpm dev` or `pnpm start`)
   - PostgreSQL (populated with migrations + default models)
   - Qdrant (`docker run -p 6333:6333 -p 6334:6334 qdrant/qdrant`)
3. **Vector collection**: Run the `vectorize-docs` script at least once so the `irmin-docs` system collection exists.

Each script uses the shared helpers in `utils.ts` (authentication headers, logging, retries, streaming decoder).

## Running tests

Execute suites with `tsx` (or `npx tsx`):

```bash
npx tsx src/tests/assistant-agent.test.ts
npx tsx src/tests/hypothetical-retrieval.test.ts
npx tsx src/tests/vectorize-docs.test.ts
npx tsx src/tests/retrieval.test.ts
```

## Test suites

### `assistant-agent.test.ts`
- Lists available agents (`GET /api/agents`)
- Retrieves the assistant config (`GET /api/agents/assistant/config`)
- Streams the assistant agent and records LangChain events (`POST /api/agents/assistant/stream`)
- Creates/updates/deletes conversations and verifies title generation
- Exercises `GET /api/info/user`, `/api/info/workspace`, `/api/info/models`, `/api/info/tools`
- Thinking tokens require streaming, so non-streaming assertions are marked as skipped

### `hypothetical-retrieval.test.ts`
- Connects to the `irmin-docs` system collection
- Measures the success rate of `retrieveWithHypotheticalContent`
- Compares baseline similarity scores vs hypothetical queries
- Exercises fallback behaviour for empty or noisy prompts
- Captures latency metrics and concurrent request handling

### `vectorize-docs.test.ts`
- Instantiates `VectorizeDocsScript` with custom parameters (replace + append modes)
- Runs the script end-to-end and validates response metadata
- Verifies database records (`vector_collections`) and Qdrant contents
- Tests retrieval helpers after indexing (similarity, context, multi-query)
- Cleans up the test collection and closes database connections

### `retrieval.test.ts`
- Uses the production `irmin-docs` collection populated by the documentation script
- Performs domain-specific similarity searches across six topic groups
- Validates context assembly, multi-query retrieval, high/low score thresholds, and token budgeting
- Measures performance and logs aggregated stats

## Utilities

- `utils.ts` – shared helpers (auth headers, streaming decoder, conversation helpers, retry/delay settings)
- `types.ts` – exported test result/config types alongside re-exports from application code

Each test logs PASS/FAIL/SKIP with human-readable output. Failures include the HTTP status, response body, and any captured error messages to simplify debugging.