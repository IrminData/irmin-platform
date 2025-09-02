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

### Vector Service

The Vector Service provides vector embeddings and similarity search capabilities using Qdrant and LangChain. It supports document storage, retrieval, and semantic search with OpenAI embeddings.

**Key Features:**
- **Vector Store Management**: Create and manage Qdrant vector collections
- **Document Operations**: Add documents with metadata to vector stores
- **Similarity Search**: Search with filters, score thresholds, and custom parameters
- **Embedding Creation**: Generate embeddings for single texts or batches using OpenAI's `text-embedding-3-small` model
- **Analytics Integration**: Track all vector operations for monitoring and debugging
- **Type Safety**: Full Zod validation and TypeScript types

**Usage Example:**
```typescript
import { vectorService } from '@/services/vector';

// Create a vector store
const vectorStore = await vectorService.createNewVectorStore({
  collectionName: 'my-documents',
  url: process.env.QDRANT_URL,
});

// Add documents
await vectorService.addDocuments(vectorStore, [
  {
    pageContent: 'Your document content here',
    metadata: { source: 'document.pdf', topic: 'ai' }
  }
]);

// Search for similar documents
const results = await vectorService.searchSimilar(vectorStore, {
  query: 'search query',
  k: 5,
  scoreThreshold: 0.8
});
```

See [vector.ts](src/services/vector.ts) for more details.

### SystemPromptBuilder Service

The SystemPromptBuilder service provides dynamic system prompt generation with context injection. It builds comprehensive system prompts by combining base prompts with contextual information about users, workspaces, conversations, and agents.

**Key Features:**
- **Context-Aware Prompts**: Automatically injects user, workspace, and conversation context
- **Timestamp Integration**: Includes current time information in prompts
- **Custom Context Support**: Allows injection of custom context data
- **Default Prompt Fallback**: Provides sensible defaults when no base prompt is specified
- **Structured Output**: Generates well-formatted, readable system prompts

**Usage Example:**
```typescript
import { systemPromptBuilder } from '@/services/systemPromptBuilder';

// Build system prompt with context
const systemPrompt = systemPromptBuilder.buildSystemPrompt(
  'You are a helpful AI assistant.',
  {
    user: { first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
    workspace: { name: 'My Workspace', slug: 'my-workspace' },
    conversationId: 'conv-123',
    agentId: 'data-analyst',
    customContext: { currentTask: 'analyze sales data' }
  }
);
```

See [systemPromptBuilder.ts](src/services/systemPromptBuilder.ts) for more details.

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
