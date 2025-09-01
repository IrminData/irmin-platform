<img src="https://github.com/IrminData/irmin-frontend/blob/development/public/irmin-logo-light.svg" width="200" alt="Irmin Logo">

# Irmin AI

LangChain-based (Fastify, TypeScript), AI chat and agents API for Irmin, with streaming responses, Groq/OpenAI integration, and MCP tools support.

## What it does

- **Streaming chat API** with real-time AI responses
- **Multiple AI providers** (Groq, OpenAI) with model switching
- **Granular MCP tools integration** with selective tool access
- **AI agents** for specialized AI tasks
- **Workspace-based conversation management** with user isolation and access control
- **Token tracking** and cost analytics

## Quick Start

1. **Install dependencies:**
```bash
pnpm install
```

2. **Set environment variables:**
```bash
cp .env.example .env
# Add your API keys and update other variables as required:
# GROQ_API_KEY=your_groq_key
# OPENAI_API_KEY=your_openai_key
```

3. **Run:**
```bash
pnpm dev          # Development
pnpm build && pnpm start  # Production
```

## API Routes

See [API.md](API.md) for detailed API documentation.

## Usage

```bash
# Basic chat
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello", "provider": "groq"}'

# With MCP tools (all tools) - requires workspace context
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-irmin-jwt-token>" \
  -H "X-Workspace-Slug: your-workspace-slug" \
  -d '{"message": "List repositories", "toolSelection": {"includeAll": true}}'

# With selective MCP tools
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-irmin-jwt-token>" \
  -H "X-Workspace-Slug: your-workspace-slug" \
  -d '{"message": "List workspaces", "toolSelection": {"includeTools": ["list_workspaces"]}}'
```

## Environment Variables

See [.env.example](.env.example) for required and optional variables.

## Commands

```bash
pnpm run build # Build for production
pnpm run dev   # Development server
pnpm run start # Start the server
pnpm run typecheck # Type checking
pnpm run lint # Linting
pnpm run lint:fix # Linting and fixing
pnpm run format # Formatting
pnpm run db:generate # Generate database migrations
pnpm run db:migrate # Run database migrations
pnpm run db:studio # Open database studio
pnpm run clean # Clean build files
```

## Services

### LLM Service

The LLM service is responsible for interacting with the LLM providers and managing models. It is also responsible for calculating the usage of the LLM.

See [llm.ts](src/services/llm.ts) for more details.

### MCP Service

The MCP service provides per-request MCP tools creation with user authentication and granular tool selection. Each request gets its own MCP tools instance with the caller's JWT token, ensuring proper user isolation and security. The service supports selective tool access through the `toolSelection` parameter.

**Tool Selection Features:**
- **Include All Tools**: `{ includeAll: true }`
- **Include Specific Tools**: `{ includeTools: ["list_workspaces", "list_docs"] }` - only specified tools
- **Exclude Specific Tools**: `{ excludeTools: ["create_workspace"] }` - all tools except specified ones
- **Combined Filtering**: Combine include and exclude for precise control
- **Server-Level Filtering**: `{ includeServers: ["irmin"] }` - all tools from specific MCP servers (future feature)

See [mcp.ts](src/services/mcp.ts) for more details.

### Analytics Service

See [analytics.ts](src/services/analytics.ts) for more details.

The Analytics Service provides comprehensive analytics tracking for the Irmin AI application, covering user interactions, performance metrics, error tracking, and system events.

### Completion Service

The Completion service is responsible for LLM completion requests, eg. streaming the completion response and sending messages to the LLM service.

See [completion.ts](src/services/completion.ts) for more details.

## Agents

A specialized AI agents framework built on top of the existing LLM services, providing structured, configurable agents for different AI tasks. This system leverages the `llmService`, `mcpService`, and `completionService` to create focused AI assistants with specific capabilities and behaviors.

**Note:** Agent chaining will be implemented using [LangGraph.js](https://langchain-ai.github.io/langgraphjs) for complex workflow orchestration in future versions.

See [agents/README.md](src/agents/README.md) for more details.

## Database

Uses SQLite with Drizzle ORM. Tables:
- `conversations` - Chat conversations (isolated by workspace and user)
- `messages` - Individual messages with token usage
- `ai_models` - Available AI models and pricing
- `analytics` - Usage tracking and events

### Workspace-Based Access Control

All conversations are associated with a specific workspace and user:
- **User Isolation**: Users can only access conversations they created
- **Workspace Isolation**: Conversations are scoped to the workspace specified in the `X-Workspace-Slug` header
- **Access Control**: All API endpoints verify workspace access before processing requests
- **Billing Attribution**: All operations are properly attributed to the correct workspace for billing purposes

## MCP Tools

Model Context Protocol tools provide external tool access. Configure in `src/services/mcp.ts`.
