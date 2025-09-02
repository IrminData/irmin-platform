# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Irmin AI is a LangChain-based AI chat and agents API built with Fastify and TypeScript, providing streaming responses, multiple AI provider support, and MCP (Model Context Protocol) tools integration. It serves as the AI backend for the Irmin data warehouse platform.

## Architecture

### Core Services

- **LLM Service** (`src/services/llm.ts`) - Manages AI providers (Groq, OpenAI) and model interactions
- **MCP Service** (`src/services/mcp.ts`) - Provides per-request MCP tools with granular access control
- **Completion Service** (`src/services/completion.ts`) - Handles streaming LLM responses and message processing
- **Analytics Service** (`src/services/analytics.ts`) - Tracks usage, performance, and error metrics
- **Vector Service** (`src/services/vector.ts`) - Manages vector embeddings with Qdrant and semantic search
- **SystemPromptBuilder Service** (`src/services/systemPromptBuilder.ts`) - Dynamic system prompt generation with context injection
- **Title Generation Service** (`src/services/titleGeneration.ts`) - Automatic conversation title generation

### AI Agents Framework

Located in `src/agents/`, provides specialized AI assistants:
- **Chat Agent** - General conversational AI
- **Query Agent** - Data querying and analysis
- **Scripting Agent** - Code generation and automation
- **Title Generation Agent** - Conversation title creation

Each agent has its own configuration and system prompt, built on top of the core services.

### Database Schema

SQLite with Drizzle ORM:
- `conversations` - Chat conversations with workspace/user isolation
- `messages` - Individual messages with token usage and cost tracking
- `ai_models` - Available AI models and pricing information
- `analytics` - Usage tracking and system events

### Authentication & Access Control

- **Workspace-based isolation** - All operations scoped to workspace via `X-Workspace-Slug` header
- **JWT-based authentication** - Required for MCP tools and workspace operations
- **User isolation** - Users can only access their own conversations
- **Per-request MCP tools** - Tools created with caller's authentication context

## Development Commands

### Core Development

```bash
# Development
pnpm dev                         # Start development server with hot reload

# Build and production
pnpm build                       # Build for production (outputs to dist/)
pnpm start                       # Start production server

# Code quality
pnpm typecheck                   # TypeScript type checking
pnpm lint                        # ESLint code linting
pnpm lint:fix                    # Fix linting issues automatically
pnpm format                      # Format code with Prettier
```

### Database Operations

```bash
pnpm db:generate                 # Generate Drizzle migrations
pnpm db:migrate                  # Apply database migrations
pnpm db:studio                   # Open Drizzle Studio for database inspection
```

### Utility Commands

```bash
pnpm clean                       # Clean build directory
```

## Environment Configuration

Required environment variables (see `.env.example`):

- **AI Providers**: `GROQ_API_KEY`, `OPENAI_API_KEY`
- **Database**: `DB_FILE_NAME` (SQLite file path)
- **External Services**: `IRMIN_API_BASE_URL`, `QDRANT_URL`
- **Observability**: `LANGSMITH_API_KEY`, `LANGSMITH_PROJECT`
- **CORS**: `CORS_ORIGINS`, `CORS_CREDENTIALS`

## Key Implementation Patterns

### MCP Tools Integration

The MCP service provides granular tool access control:
- `{ includeAll: true }` - All available tools
- `{ includeTools: ["tool_name"] }` - Specific tools only
- `{ excludeTools: ["tool_name"] }` - All except specified tools
- Tools are created per-request with caller's JWT token for proper isolation

### Streaming Responses

All chat endpoints support streaming via LangChain's streaming interface, compatible with Vercel AI SDK patterns.

### Context Management

Services use a consistent context pattern:
- User and workspace information from authentication
- Conversation history fetched from database
- Custom context injection via SystemPromptBuilder
- Vector store integration for semantic search

### Error Handling

- Global error handler with analytics logging
- Structured error responses via `utils/errors.ts`
- Request context preservation through middleware chain

## File Structure Notes

- `src/config/` - Environment validation and service configuration
- `src/middleware/` - Authentication and workspace middleware
- `src/routes/` - API route handlers organized by feature
- `src/types/` - TypeScript type definitions
- `src/utils/` - Utility functions for errors and responses
- `src/irmin-api/` - Integration with main Irmin API service

## Build Configuration

- **TypeScript**: Strict mode with path aliases (`@/` maps to `src/`)
- **Bundling**: tsup with ESM output and sourcemaps
- **External Dependencies**: Key dependencies externalized for optimal bundling
- **Node Version**: Requires Node.js >=22.10.0 with pnpm 10.12.1+