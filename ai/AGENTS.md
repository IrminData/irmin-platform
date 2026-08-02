# AGENTS.md

This file provides guidance to coding agents (Claude Code, Gemini CLI, etc.) when working with code in this repository. `CLAUDE.md` and `GEMINI.md` are symlinks to this file.

## Project Overview

Irmin AI is a LangChain-powered AI service (Fastify + TypeScript) providing streaming LLM agents, vector embeddings, and RAG capabilities for the Irmin data warehouse platform. It uses Anthropic Claude for primary reasoning, Groq for fast inference, and OpenAI for embeddings and fallback.

## Development Commands

```bash
# Dependencies (requires Node.js 24+, pnpm 10.22.0+)
pnpm install

# Development
pnpm dev                  # Fastify dev server with tsx watch
pnpm build                # Type-check, lint, bundle with tsup
pnpm start                # Run compiled server

# Code validation
pnpm validate             # TypeScript + lint with auto-fixes
pnpm typecheck            # TypeScript checks only
pnpm lint                 # ESLint
pnpm lint:fix             # ESLint with auto-fixes
pnpm format               # Prettier formatting

# Database (Drizzle ORM + PostgreSQL)
pnpm db:generate          # Generate migrations from schema changes
pnpm db:migrate           # Apply migrations
pnpm db:studio            # Launch Drizzle Studio UI

# Unused code detection
pnpm knip                 # Find unused exports
pnpm knip:fix             # Auto-fix unused imports

# Docker (PostgreSQL + Qdrant)
docker compose up -d db_ai qdrant    # Infrastructure only
docker compose up -d                  # Full stack
```

## Architecture

### Core Services Layer (`src/services/`)

- **llm.ts** - Multi-provider LLM factory (Anthropic/Groq/OpenAI) with LangSmith tracing
- **agent.ts** - LangGraph wrapper with Postgres checkpointer for persistent agent memory
- **tools.ts** - Request-scoped MCP tool client that loads Irmin tools when JWT is provided
- **analytics.ts** - Event logging to PostgreSQL (model usage, vector ops, errors)
- **systemPromptBuilder.ts** - Dynamic system prompt generation with user/workspace/agent metadata
- **titleGeneration.ts** - Async conversation title generation after responses

### Agents Framework (`src/agents/`)

All agents extend `BaseAgent` and override hooks:
- `getAgentOptions()` - LLM config, middleware, tool selection
- `prepareContext()` - Vector retrieval and custom context
- `execute()` - Execution logic (streaming vs synchronous)

**Built-in agents:**
- `assistant` - Claude Sonnet 4.5 with thinking tokens, MCP tools, HyDE retrieval, streaming
- `query` - Groq Llama 3.3 for SQL generation (synchronous)
- `scripting` - Groq Llama 3.3 for Go code generation (synchronous)

**Adding a new agent:**
1. Create `src/agents/my-agent/config.ts` with `AgentConfig`
2. Create `src/agents/my-agent/index.ts` extending `BaseAgent`
3. Register in `AgentsManager` constructor (`src/agents/index.ts`)

### Vector & RAG (`src/vector/`)

- **IndexingService** - Document chunking, embedding, Qdrant upload
- **RetrievalService** - Similarity search, HyDE retrieval, context building
- **QdrantService** - Low-level Qdrant client wrapper

**System collections** (populated by `vectorize-docs` script):
- `irmin-docs` - Irmin SDK + local `llm-docs/*.md` content
- `duckdb-sql-syntax-docs` - DuckDB SQL reference

### Database Schema (`src/database/schema.ts`)

- `conversations` - Workspace + user scoped threads
- `ai_models` - LLM catalog with pricing metadata
- `analytics` - Event log for operations
- `vector_collections` - Qdrant collection metadata

Message history is stored by LangGraph Postgres checkpointer, not in a separate messages table.

### Routes (`src/routes/`)

All routes (except `/health`) require `Authorization: Bearer <token>` + `X-Workspace-Slug` header.

- `/api/agents/:agentId` and `/stream` - Execute agents
- `/api/conversations` - CRUD for conversations
- `/api/embeddings/*` - Vector collection management and search
- `/api/system/*` - Admin endpoints (require `AI_API_SYSTEM_TOKEN`)
- `/api/info/*` - User, workspace, models, tools metadata

### Middleware (`src/middleware/`)

- **auth.ts** - JWT validation against Irmin Core API with 15-minute caching
- **workspace.ts** - Extracts `X-Workspace-Slug` and validates membership
- **systemAuth.ts** - Validates `AI_API_SYSTEM_TOKEN` for system endpoints

## Key Patterns

### Streaming Responses

Agent responses use LangChain v2 `StreamEvent` format converted to NDJSON. Event types:
- `reasoning-delta` / `reasoning-end` - Anthropic thinking tokens
- `llm_response` / `agent_response` - Natural language output
- `tool_call_*` / `tool_result_*` - MCP tool execution

### Input Sanitization

`AgentsManager` sanitizes all messages via `src/utils/sanitization.ts`:
- Strips prompt injection markers, script/command payloads, zero-width characters
- Enforces 35,000 character limit
- Empty messages after sanitization raise errors

### Workspace Isolation

All data is scoped by `workspaceSlug` + `userId`:
- Conversations validated against caller
- Vector collections respect workspace membership and creator ownership
- System collections accessible to all authenticated users

### LLM Middleware (LangChain)

- `summarizationMiddleware` - Compresses long conversations at token/message thresholds
- `llmToolSelectorMiddleware` - Filters tools by context (max 10, preserves core tools)
- `modelFallbackMiddleware` - Transparent fallback to cheaper models on failure

## Testing

Tests live in `src/tests/` and run with tsx:

```bash
tsx src/tests/assistant-agent.test.ts
tsx src/tests/retrieval.test.ts
tsx src/tests/hypothetical-retrieval.test.ts
tsx src/tests/vectorize-docs.test.ts
```

Requires `TEST_IRMIN_AUTH_TOKEN` and `TEST_WORKSPACE_SLUG` in `.env`.

## Environment Setup

Copy `.env.example` to `.env` and configure:

**Required:**
- `DATABASE_URL` - PostgreSQL connection
- `ANTHROPIC_API_KEY`, `GROQ_API_KEY`, `OPENAI_API_KEY` - LLM providers
- `AI_API_SYSTEM_TOKEN` - System endpoint authentication

**Optional:**
- `QDRANT_URL`, `QDRANT_PORT`, `QDRANT_API_KEY` - Vector database (defaults to localhost:6333)
- `IRMIN_API_BASE_URL` - Irmin Core API for MCP tools
- `LANGSMITH_TRACING`, `LANGSMITH_API_KEY` - LLM observability
- `SENTRY_DSN` - Error tracking

## Code Quality

- TypeScript strict mode with path aliases (`@/services/*`, `@/agents/*`, etc.)
- ESLint with `@typescript-eslint`, `import-x` (no cycles, no duplicates), `promise` plugins
- Prettier with import sorting via `@trivago/prettier-plugin-sort-imports`
- `no-unused-vars: error`, `no-explicit-any: warn`, `prefer-const: error`

## Swagger Documentation

Interactive API docs at `http://localhost:3000/docs` when running locally.

## Handoff

Before handing off work — finishing a task, opening a PR, or passing to another agent — run the `document-release` skill to reconcile docs (README, ARCHITECTURE, CONTRIBUTING, this AGENTS.md) with what actually shipped. This is required, not optional: it prevents doc drift and ensures the next agent picks up accurate context.
