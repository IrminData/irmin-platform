<img src="https://raw.githubusercontent.com/IrminData/.github/refs/heads/development/irmin-logo-light.svg" width="200" alt="Irmin Logo">

# Irmin AI

LangChain-powered (Fastify, TypeScript) AI agents API for Irmin with OpenRouter inference, provider-neutral run events, persisted agent memory, and workspace-scoped vector retrieval.

## What it does

- Version-controlled inference roles routed through OpenRouter with reviewed ZDR providers, ordered model fallbacks, exact usage/cost telemetry, and a temporary direct-Anthropic rollback path
- Request-scoped MCP tool access so the assistant agent can load Irmin MCP tools whenever a bearer token is supplied
- Persisted agent memory via LangGraph Postgres checkpointing to keep multi-turn conversations aligned with the database
- Versioned `RunEventV1` NDJSON streaming that isolates browsers from LangChain/provider payloads and exposes curated progress instead of raw reasoning
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

Open `.env` and fill in the values you need. See [`.env.example`](.env.example) for the full list of variables, defaults, and descriptions. All variables are read at process startup (runtime). 3. **Run:**

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

Streaming responses are emitted as newline-delimited `RunEventV1` envelopes. Every event has a run-scoped monotonic sequence and one of these provider-neutral types:

- `run.started`, `message.delta`, and curated `reasoning.summary`
- `tool.started`, `tool.completed`, `tool.failed`, and `tool.approval_required`
- `usage`
- exactly one terminal `run.completed`, `run.failed`, or `run.cancelled`

Raw reasoning and provider response structures remain server-side. Browser cancellation aborts the model stream and cancellable tools.

Use `/api/agents/:agentId/stream` for real-time output. Non-streaming endpoints return `AgentResponse` objects for synchronous agents (query, scripting), while the assistant returns an empty `content` field because output is streamed.

## Environment Variables

Copy the template and fill in the values you need:

```bash
cp .env.example .env
```

[`.env.example`](.env.example) is the single source of truth — every var is loaded once at startup via dotenv and validated by Zod. Everything is runtime config; there are no build-time vars.

### Accessing env vars in code

Don't read `process.env.*` directly. Import the typed `env` object from [`src/config/env.ts`](src/config/env.ts):

```ts
import { env } from '@/config/env';

const dsn = env.SENTRY_DSN;
```

Adding a new var: update `.env.example` and the Zod schema in `src/config/env.ts`.

### Model-profile governance

Profiles are reviewed in Git in `src/inference/profiles.ts`; `/api/info/model-profile` is read-only. New OpenRouter providers require a reviewed config change recording provider identity, operator, ZDR evidence, review date, supported capabilities, and rollback owner. Live evaluations are opt-in and must not run in hermetic CI.

Promotion requires no safety/tool-authorization regression, task success within two points of baseline, at least 40% lower median model cost, and p95 latency no more than 20% worse. Rollout uses deterministic workspace/conversation buckets at 5%, 25%, then 100%, held for one internal release cycle at each stage. `AI_INFERENCE_BACKEND=direct-anthropic` is the temporary emergency rollback during this rollout.

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

## Testing

Hermetic unit tests run in CI and require no credentials:

```bash
pnpm test:unit
```

Live integration and evaluation scripts are opt-in because they use local
infrastructure, provider credits, and workspace credentials:

```bash
pnpm test:integration:assistant
pnpm test:integration:retrieval
pnpm test:eval:hyde
pnpm test:eval:vectorization
```

### Run protocol and telemetry

The streaming agent endpoint returns `application/x-ndjson` using the versioned
Irmin `RunEventV1` envelope. Provider and LangChain events, raw reasoning, and
reasoning metadata are server-only. Each assistant run writes prompt-free
operational telemetry to `model_runs`; user ratings are stored separately in
`message_feedback`.

Detailed model-run telemetry defaults to a 90-day retention window:

```bash
pnpm telemetry:prune
```

Before launch, conversation and LangGraph checkpoint data can be reset only
with an explicit acknowledgement:

```bash
IRMIN_PRELAUNCH_RESET_ACK=RESET_IRMIN_PRELAUNCH_AI_DATA pnpm db:reset:prelaunch-ai
```

Live test utilities live in `src/tests/`:

- `assistant-agent.test.ts` – Opt-in live agent, conversation, and info endpoint checks
- `hypothetical-retrieval.test.ts` – Benchmarks `retrieveWithHypotheticalContent`, compares baseline vs hypothetical queries, and verifies fallback/error handling
- `vectorize-docs.test.ts` – Runs the ingestion script in replace/append modes, validates Qdrant indexing, and ensures local markdown files are ingested
- `retrieval.test.ts` – Validates similarity search, context assembly, multi-query retrieval, and threshold behaviour across the `irmin-docs` collection

> See [src/tests/README.md](src/tests/README.md) for prerequisites and step-by-step guidance.

## Services

### Inference gateway

`InferenceGateway` resolves stable roles from a Git-reviewed profile, constructs the OpenRouter model with strict provider/privacy policy, and installs prompt-free telemetry callbacks. Callers never supply model IDs or provider options. See [src/inference](src/inference) and `GET /api/info/model-profile`.

### MCP (tools) service

Creates request-scoped `MultiServerMCPClient` instances, requires a caller JWT before exposing Irmin MCP endpoints, and returns tool definitions that plug directly into LangChain agents.
See [src/services/tools.ts](src/services/tools.ts).

### Analytics service

Persists structured analytics events (model usage, vector ops, errors) to PostgreSQL and associates them with AI models when possible.
See [src/services/analytics.ts](src/services/analytics.ts).

### SystemPromptBuilder service

Generates system prompts that combine base text with user, workspace, conversation, and agent metadata, while accepting optional custom context.
See [src/services/systemPromptBuilder.ts](src/services/systemPromptBuilder.ts).

### Title generation service

Creates fallback titles and atomically claims one generation attempt after the first successful response; failed/cancelled runs never trigger titles.
See [src/services/titleGeneration.ts](src/services/titleGeneration.ts).

## Input normalization and context trust

User messages retain valid SQL, source code, base64, and role-like text. The runtime applies NFC Unicode and line-ending normalization and rejects content above 35,000 characters instead of truncating it. `ContextAssembler` labels provenance/trust, reserves 25% of each role budget for output and tools, and deterministically summarizes retrieved context. Tool authorization and specialist output validation provide the security boundary.

## Vector Embeddings & RAG

Irmin AI ships with a Qdrant-backed RAG stack:

- **IndexingService** – Validates documents with Zod, creates embeddings via OpenAI, tracks collection stats, and supports replace/append workflows
- **RetrievalService** – Provides similarity search, context assembly, multi-query retrieval, contextual compression, and hypothetical-content retrieval through the `hyde` inference role
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

The agents framework sits atop `InferenceGateway`, `toolsService`, and LangChain agent builders.

- `assistant` – `assistant` role with optional MCP tools and vector-backed context enrichment
- `query` – `query` role that validates repository context before SQL generation
- `scripting` – `scripting` role for Go automation generation

All agents share normalized inputs, workspace/user validation, persisted conversation history, and analytics logging. SQL results require successful execution evidence; Go results are formatted and compiled before acceptance. Extend the framework via [src/agents/README.md](src/agents/README.md).

## Database

PostgreSQL (via Drizzle ORM) stores conversation metadata, prompt-free model telemetry, feedback, vector collections, and analytics. LangGraph owns checkpointed message history.

**Schema highlights**

- `conversations` – Workspace + user scoped threads with optional `agentId`
- `model_runs` – Resolved provider/model, role/profile, tokens, exact OpenRouter cost, latency, and terminal status; never prompts or tool payloads
- `message_feedback` – User-owned rating and optional reason for a message/run
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
