<img src="https://github.com/IrminData/irmin-console/blob/development/public/irmin-logo-light.svg" width="200" alt="Irmin Logo">

# Irmin AI

LangChain-powered (Fastify, TypeScript) AI agents API for Irmin with Anthropic reasoning streams, Groq/OpenAI fallbacks, persisted agent memory, and workspace-scoped vector retrieval.

## What it does

- Multi-provider LLM runtime across Anthropic, Groq, and OpenAI with configurable temperatures, token limits, and automatic fallbacks
- Request-scoped MCP tool access so the assistant agent can load Irmin MCP tools whenever a bearer token is supplied
- Persisted agent memory via LangGraph Postgres checkpointing to keep multi-turn conversations aligned with the database
- NDJSON streaming pipeline that forwards LangChain v2 `StreamEvent`s (reasoning deltas, tool activity, final responses) directly to clients
- Workspace-isolated conversations & analytics with automatic title generation and token usage tracking
- Vector services for Qdrant-backed RAG, including hypothetical-query retrieval, contextual compression, and multi-query helpers
- Document ingestion through a vectorization script that merges remote SDK docs with local `llm-docs` content
- Comprehensive REST surface for agents, conversations, embeddings, system scripts, and informational endpoints

## Monitoring and Observability

This project integrates with [Sentry](https://sentry.io) for error tracking and performance monitoring, and [LangSmith](https://smith.langchain.com/) for LLM observability and debugging. These tools provide comprehensive insights into application performance, error tracking, and LLM chain execution for better debugging and optimization.

### Sentry configuration

Sentry is disabled by default in dev so local errors don't reach the
shared project. Set `SENTRY_ENABLED=true` and `SENTRY_DSN` to enable.
Source map upload (via `pnpm run sentry:sourcemaps`) is also opt-in —
it no-ops unless `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT`
are all set, so it's safe to wire into CI without blocking local builds.
Set `SENTRY_URL` to point at a self-hosted / EU / private-cloud Sentry.

See `.env.example` for the full list of Sentry env vars:
`SENTRY_ENABLED`, `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_ORG`,
`SENTRY_PROJECT`, `SENTRY_URL`, `SENTRY_AUTH_TOKEN`,
`SENTRY_TRACES_SAMPLE_RATE`, `SENTRY_PROFILE_SESSION_SAMPLE_RATE`.

## Prerequisites

Ensure you have the following installed:

- Node.js (24.x)
- pnpm (10.22.0+). See [pnpm Installation Guide](https://pnpm.io/installation) for installation details.

## Quick Start

1. **Install dependencies:**
```bash
pnpm install
```
2. **Set environment variables:**
```bash
cp .env.example .env
```
Open `.env` and fill in the values you need. See [`.env.example`](.env.example) for the full list of variables, defaults, and descriptions. All variables are read at process startup (runtime).
3. **Run:**
```bash
   pnpm dev               # Development
pnpm build && pnpm start  # Production
```

### Swagger/OpenAPI Documentation

The API includes comprehensive Swagger/OpenAPI documentation with interactive testing capabilities.

**Access Swagger UI:**
```bash
# Start the development server
pnpm dev

# Open Swagger UI in your browser
open http://localhost:3000/docs
```

**Features:**
- 📊 Interactive explorer – exercise every endpoint directly in the browser
- 🔐 Authentication support – built-in JWT and workspace header authentication
- 📝 Complete schemas – request/response payloads with examples
- 🏷️ Organized tags – Agents, Conversations, Embeddings, System Scripts, Info
- ⚡ Streaming support – try the assistant’s NDJSON event stream live

**Authentication in Swagger:**
1. Click **Authorize**
2. Enter your JWT in `bearerAuth`
3. Provide `X-Workspace-Slug` in `workspaceHeader`
4. Call authenticated endpoints directly from the UI

**Endpoint overview:**
- `POST /api/agents/:agentId` and `/stream` – execute agents (assistant streams by default)
- `GET/POST /api/conversations` – manage workspace-scoped conversations and messages
- `GET /api/info/*` – fetch user, workspace, model, and tool metadata
- `GET/POST /api/embeddings/*` – manage vector collections, index documents, and run searches
- `POST /api/system/scripts/vectorize-docs` – trigger the documentation ingestion script

**OpenAPI spec:**
- JSON: `http://localhost:3000/docs/json`
- YAML: `http://localhost:3000/docs/yaml`

## Usage

```bash
# Assistant agent (non-streaming response envelope)
curl -X POST http://localhost:3000/api/agents/assistant \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-irmin-jwt-token>" \
  -H "X-Workspace-Slug: your-workspace-slug" \
  -d '{"message": "Hello! Can you help me understand what Irmin does?"}'

# Assistant agent with streaming NDJSON output
curl -X POST http://localhost:3000/api/agents/assistant/stream \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-irmin-jwt-token>" \
  -H "X-Workspace-Slug: your-workspace-slug" \
  -d '{"message": "Explain how data versioning works in Irmin"}'

# Assistant agent reusing an existing conversation thread
curl -X POST http://localhost:3000/api/agents/assistant/stream \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-irmin-jwt-token>" \
  -H "X-Workspace-Slug: your-workspace-slug" \
  -d '{"message": "Show me how to create a repository", "conversationId": "your-conversation-id"}'
```

## Agent Runtime & Streaming

Agents use LangChain’s `createAgent` builder backed by the LangGraph Postgres checkpointer. Each conversation maps to a `thread_id`, so agent state persists between requests and stays aligned with the `conversations` table. The assistant enriches context with vector results and optionally loads MCP tools.

Streaming responses are emitted as newline-delimited JSON and forward LangChain v2 `StreamEvent`s verbatim. Expect:
- `reasoning-delta` / `reasoning-end` events from Anthropic thinking tokens
- `llm_response` / `agent_response` chunks with natural language output
- `tool_call_*` and `tool_result_*` events when MCP tools execute
- Final completion envelopes containing metadata (e.g., token usage)

Use `/api/agents/:agentId/stream` for real-time output. Non-streaming endpoints return `AgentResponse` objects for synchronous agents (query, scripting), while the assistant returns an empty `content` field because output is streamed.

## Environment Variables

Copy the template and fill in the values you need:

```bash
cp .env.example .env
```

All variables, their defaults, and inline descriptions live in [`.env.example`](.env.example) — that is the single source of truth. Everything the service reads is runtime configuration (loaded at process startup via dotenv); there are no build-time variables.

## Commands

```bash
pnpm run build       # Type-check, lint, and bundle with tsup
pnpm run dev         # Fastify dev server (tsx watch)
pnpm run start       # Start compiled server
pnpm run typecheck   # TypeScript checks only
pnpm run lint        # ESLint (no fixes)
pnpm run lint:fix    # ESLint with automatic fixes
pnpm run format      # Prettier over src/
pnpm run db:generate # Generate Drizzle migrations
pnpm run db:migrate  # Apply migrations
pnpm run db:studio   # Launch Drizzle Studio
pnpm run clean       # Remove build artifacts
```

## System Scripts

The system scripts framework handles operational jobs with zero configuration.

**Available script**
- `vectorize-docs` – Fetches Groq/OpenAI SDK documentation from GitHub, ingests local `llm-docs/*.md`, chunks content, uploads vectors to the `irmin-docs` system collection, and prunes stale chunks when `replaceMode` is enabled.

See [src/scripts/README.md](src/scripts/README.md) for execution details.

### Script principles
- Zero configuration defaults for collection names, chunk sizes, and sources
- Simple execution via API (`POST /api/system/scripts/vectorize-docs`), `tsx`, or direct import
- Self-contained analytics logging, replace vs append behaviour, and Qdrant clean-up
- Ready for future scheduling automation and additional maintenance scripts

### Example response
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

## API Testing

Test utilities live in `src/tests/` and can be executed with `tsx`:
- `assistant-agent.test.ts` – Agent listing, configuration, Anthropic reasoning streams, conversation CRUD, info endpoints (non-streaming assertions are skipped because thinking tokens require streaming)
- `hypothetical-retrieval.test.ts` – Benchmarks `retrieveWithHypotheticalContent`, compares baseline vs hypothetical queries, and verifies fallback/error handling
- `vectorize-docs.test.ts` – Runs the ingestion script in replace/append modes, validates Qdrant indexing, and ensures local markdown files are ingested
- `retrieval.test.ts` – Validates similarity search, context assembly, multi-query retrieval, and threshold behaviour across the `irmin-docs` collection

> See [src/tests/README.md](src/tests/README.md) for prerequisites and step-by-step guidance.

## Services

### LLM service
Wraps Anthropic, Groq, and OpenAI chat models using LangSmith tracing wrappers. Supplies shared defaults plus provider-specific overrides for thinking tokens, streaming, and timeouts. Provides metadata for `/api/info/models`.
See [src/services/llm.ts](src/services/llm.ts).

### MCP (tools) service
Creates request-scoped `MultiServerMCPClient` instances, requires a caller JWT before exposing Irmin MCP endpoints, and returns tool definitions that plug directly into LangChain agents.
See [src/services/tools.ts](src/services/tools.ts).

### Analytics service
Persists structured analytics events (model usage, vector ops, errors) to PostgreSQL and associates them with AI models when possible.
See [src/services/analytics.ts](src/services/analytics.ts).

### SystemPromptBuilder service
Generates system prompts that combine base text with user, workspace, conversation, and agent metadata, while accepting optional custom context.
See [src/services/systemPromptBuilder.ts](src/services/systemPromptBuilder.ts).

### Completion service
Streams completions from configured models and integrates with analytics logging.
See [src/services/completion.ts](src/services/completion.ts).

### Title generation service
Creates fallback titles, triggers async updates after assistant responses, validates AI output, and records analytics.
See [src/services/titleGeneration.ts](src/services/titleGeneration.ts).

## Input Sanitization

`AgentsManager` sanitizes messages before execution, stripping prompt-injection markers, script/command payloads, and zero-width characters while enforcing max length (35,000 characters by default). Empty messages after sanitization raise an error. See [src/utils/sanitization.ts](src/utils/sanitization.ts) for the full rule set.

## Vector Embeddings & RAG

Irmin AI ships with a Qdrant-backed RAG stack:
- **IndexingService** – Validates documents with Zod, creates embeddings via OpenAI, tracks collection stats, and supports replace/append workflows
- **RetrievalService** – Provides similarity search, context assembly, multi-query retrieval, contextual compression, and hypothetical-content retrieval (HyDE-style) using Groq LLMs
- **CollectionService** – Manages workspace/user scoped collections in PostgreSQL with access checks and statistic helpers

Run Qdrant locally:
```bash
docker run -p 6333:6333 -p 6334:6334 qdrant/qdrant
```
Dashboard: `http://localhost:6333/dashboard`

Detailed documentation lives in [src/vector/README.md](src/vector/README.md).

### Embeddings API

`/api/embeddings/*` exposes REST endpoints for collection CRUD, document indexing, similarity search, context retrieval, and embedding generation. System endpoints under `/api/system/embeddings/*` offer administrative access. Payload schemas are documented in [src/vector/README.md](src/vector/README.md).

## Agents

The agents framework sits atop `llmService`, `toolsService`, and LangChain agent builders.
- `assistant` – Anthropic-first streaming agent with reasoning tokens, optional MCP tool usage, Groq/OpenAI fallback middleware, and vector-backed context enrichment
- `query` – Groq-powered SQL generator that validates repository context before execution (synchronous responses)
- `scripting` – Groq-powered Go automation generator (synchronous responses)

All agents share sanitized inputs, workspace/user validation, persisted conversation history, and analytics logging. Extend the framework via [src/agents/README.md](src/agents/README.md).

## Database

PostgreSQL (via Drizzle ORM) stores conversations, messages, AI models, vector collections, and analytics.

**Schema highlights**
- `conversations` – Workspace + user scoped threads with optional `agentId`
- `messages` – Stores message content, type (reasoning/assistant/user), and token usage
- `ai_models` – Catalog of supported models and pricing metadata
- `vector_collections` – Tracks Qdrant collections, counts, and metadata
- `analytics` – Event log for key operations

**Setup**
1. Provision PostgreSQL
2. Set `DATABASE_URL`
3. Run `pnpm db:generate && pnpm db:migrate`

### Workspace-based access control
- Requests require `Authorization` and `X-Workspace-Slug`
- Middleware enforces user/workspace membership
- Agents verify conversations belong to the caller
- Vector collections respect workspace membership and creator ownership

## MCP Tools

Model Context Protocol tools extend agent capabilities. Configure additional servers in `src/services/mcp.ts`. Tool inclusion/exclusion is controlled per request via the agent input’s `toolSelection` option.

## Docker

> For the best Docker experience on macOS, we recommend using [OrbStack](https://orbstack.dev/) instead of Docker Desktop. 

### Docker Compose Setup

Spin up infrastructure with the provided `docker-compose.yml`:
- **API Service** (`irmin_ai`) – Fastify server
- **PostgreSQL** (`db_ai`) – Application database
- **Qdrant** (`qdrant`) – Vector store

#### Run infrastructure only
```bash
docker compose up -d db_ai qdrant
```
- PostgreSQL on port 5436
- Qdrant on port 6333

#### Run the full stack
```bash
docker compose up -d
```

#### Stop services
```bash
# Stop containers
docker compose down

# Remove volumes (deletes data)
docker compose down -v
```

### Dockerfile Usage

#### Build and run
```bash
docker build -t irmin-ai .
docker run -p 3001:3000 --env-file .env irmin-ai
```

#### Multi-platform buildx example
```bash
docker buildx create --use
docker buildx ls
docker buildx build --platform linux/amd64/v2,linux/arm64/v8 \
  -t YOUR_DOCKER_USERNAME/irmin-ai:latest --push .
docker run -p 3001:3000 --env-file .env irmin-ai
```

## License

This project is licensed under the [Elastic License 2.0 (ELv2)](LICENSE).
