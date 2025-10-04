<img src="https://github.com/IrminData/irmin-console/blob/development/public/irmin-logo-light.svg" width="200" alt="Irmin Logo">

# Irmin AI

LangChain-based (Fastify, TypeScript), AI chat and agents API for Irmin, with streaming responses, Groq/OpenAI integration, MCP tools support, and **LangGraph.js-powered iterative tool calling**.

## What it does

- **Streaming chat API** with real-time AI responses
- **Multiple AI providers** (Groq, OpenAI) with model switching
- **Granular MCP tools integration** with selective tool access
- **AI agents** for specialized AI tasks with **iterative problem-solving**
- **LangGraph.js integration** for ReAct pattern (Reasoning + Acting) workflows
- **Real-time tool call streaming** with thinking steps and iteration tracking
- **Automatic conversation title generation** using AI for better organization
- **Workspace-based conversation management** with user isolation and access control
- **Token tracking** and cost analytics
- **RAG (Retrieval Augmented Generation)** with vector embeddings and similarity search
- **Document vectorization** for both remote URLs and local LLM documentation files

## Monitoring and Observability

This project integrates with [Sentry](https://sentry.io) for error tracking and performance monitoring, and [LangSmith](https://smith.langchain.com/) for LLM observability and debugging. These tools provide comprehensive insights into application performance, error tracking, and LLM chain execution for better debugging and optimization.

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
- 📊 **Interactive API Explorer** - Test all endpoints directly from the browser
- 🔐 **Authentication Support** - Built-in JWT and workspace header authentication
- 📝 **Complete Schema Documentation** - All request/response schemas with examples
- 🏷️ **Organized by Tags** - Endpoints grouped by Chat, Conversations, Agents, Embeddings, System Scripts, and Info
- ⚡ **Real-time Testing** - Test streaming responses and file uploads

**Using Authentication in Swagger:**
1. Click the "Authorize" button in Swagger UI
2. Enter your JWT token in the `bearerAuth` field
3. Add your workspace slug in the `workspaceHeader` field
4. Test authenticated endpoints directly

**API Endpoints Overview:**
- **Chat** (`/api/chat`) - Send messages and get AI responses with streaming support and **iterative tool calling**
- **Conversations** (`/api/conversations`) - Manage conversation history and messages
- **Agents** (`/api/agents`) - Execute specialized AI agents for specific tasks with **LangGraph-powered workflows**
- **Info** (`/api/info`) - Get user profile, workspace info, available models, and MCP tools
- **Embeddings** (`/api/embeddings`) - Vector store management, document indexing, and similarity search
- **Embeddings** (`/api/system/embeddings`) **system** - Administrative operations for vector store management, document indexing, and similarity search
- **Scripts** (`/api/system/scripts`) **system** - Execute system maintenance scripts like document vectorization

**OpenAPI Specification:**
- JSON: `http://localhost:3000/docs/json`
- YAML: `http://localhost:3000/docs/yaml`

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

## LangGraph.js Integration

The service now includes **LangGraph.js-powered iterative tool calling** for enhanced problem-solving capabilities:

### Iterative Agent Workflows

When tools are available, agents automatically use LangGraph.js to:
- **Think → Act → Think**: Follow ReAct pattern for complex problem-solving
- **Stream Real-time Updates**: Show tool calls, thinking steps, and results as they happen
- **Track Iterations**: Monitor the agent's reasoning process through multiple steps
- **Limit Execution**: Prevent infinite loops with configurable maximum tool calls (default: 10)

### Streaming Event Types

The streaming API now provides rich event types:

```json
// Iteration tracking
{"type": "iteration", "data": {"iteration": 1, "totalToolCalls": 2}}

// Tool calls
{"type": "tool_calls", "data": {"toolCalls": [...], "iteration": 1}}

// Tool results  
{"type": "tool_result", "data": {"toolName": "search", "content": "...", "iteration": 1}}

// Thinking steps
{"type": "thinking", "data": {"content": "Based on the search results...", "iteration": 2}}

// Completion
{"type": "completed", "data": {"toolCalls": 3, "iterations": 2, "finalMessage": "..."}}
```

## Environment Variables

See [.env.example](.env.example) for required and optional variables.

To set environment variables, copy the `.env.example` file and update the variables as required.
```bash
cp .env.example .env
# Add your API keys and update other variables as required:
# GROQ_API_KEY=your_groq_api_key
# OPENAI_API_KEY=your_openai_api_key
```

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

## System Scripts

The Irmin AI service includes a system scripts framework for automated tasks and maintenance operations. Scripts are simple, executable functions with hardcoded configurations that can be run manually or scheduled for future automation.

**Available Scripts:**
- **Vectorize Docs Script** - Automatically fetches and vectorizes documentation from URLs and local files into vector collections

See [Scripts Documentation](src/scripts/README.md) for detailed information about available scripts and usage examples.

### Scripts Concept

**Purpose**: System scripts provide a way to perform routine maintenance, data processing, and automated tasks without requiring complex configuration or user interaction.

**Key Principles**:
- **Zero Configuration**: Scripts use hardcoded, sensible defaults
- **Simple Execution**: Can be run via API endpoints, CLI commands, or programmatically
- **Self-Contained**: Each script handles its own error handling, logging, and analytics
- **Future-Ready**: Designed to be easily scheduled or automated in the future

### Usage

Scripts can be executed in multiple ways:

1. **API Endpoints** - System-level endpoints for programmatic execution
2. **Package Scripts** - CLI commands via `pnpm script:name`
3. **Direct Import** - Import and execute programmatically in your code

## API Testing

The project includes comprehensive API test utilities located in `src/tests/`. These tests cover all major endpoints including chat, agents, conversation flows, and document vectorization.

> For detailed test documentation see [src/tests/README.md](src/tests/README.md)

## Services

### LLM Service

The LLM service is responsible for interacting with the LLM providers and managing models. It is also responsible for calculating the usage of the LLM.

See [llm.ts](src/services/llm.ts) for more details.

### MCP Service

The MCP service provides per-request MCP tools creation with user authentication and granular tool selection. Each request gets its own MCP tools instance with the caller's JWT token, ensuring proper user isolation and security. The service supports selective tool access through the `toolSelection` parameter.

**Tool Selection Features:**
- **Include All Tools**: `{ includeAll: true }`
- **Include Specific Tools**: `{ includeTools: ["list_workspaces", "retrieve_docs_context"] }` - only specified tools
- **Exclude Specific Tools**: `{ excludeTools: ["create_workspace"] }` - all tools except specified ones
- **Combined Filtering**: Combine include and exclude for precise control
- **Server-Level Filtering**: `{ includeServers: ["irmin"] }` - all tools from specific MCP servers (future feature)

See [mcp.ts](src/services/mcp.ts) for more details.

### Analytics Service

See [analytics.ts](src/services/analytics.ts) for more details.

The Analytics Service provides comprehensive analytics tracking for the Irmin AI application, covering user interactions, performance metrics, error tracking, and system events.


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

### Title Generation Service

The Title Generation Service provides automatic conversation title generation using AI. It generates concise, descriptive titles based on the first user message in a conversation and includes smart fallback handling when AI generation fails.

**Key Features:**
- **Automatic Title Generation**: Generates titles for new conversations asynchronously
- **Smart Fallback Detection**: Identifies conversations with placeholder titles that need updating
- **Title Validation**: Validates generated titles to avoid AI artifacts or inappropriate content
- **Manual Title Generation**: Provides API endpoint for manual title regeneration
- **Analytics Integration**: Tracks title generation success/failure rates for monitoring

**Usage Example:**
```typescript
import { titleGenerationService } from '@/services/titleGeneration';

// Generate a title for a conversation
const result = await titleGenerationService.generateTitle({
  message: 'How do I implement authentication?',
  user: { id: 'user-123' },
  workspace: { slug: 'my-workspace' }
});

// Update conversation title if needed
const updated = await titleGenerationService.updateConversationTitleIfNeeded(
  'conversation-id',
  titleOptions
);
```

The service automatically:
- Generates titles for new conversations created via chat or agents
- Handles errors gracefully without affecting the main conversation flow
- Logs analytics events for monitoring and debugging

See [titleGeneration.ts](src/services/titleGeneration.ts) for more details.

## Input Sanitization

The Irmin AI service includes simple input sanitization to protect against malicious content, empty messages, and overly long messages. All user inputs and system prompts are automatically sanitized before processing.

**Key Features:**
- **Length Limits**: Enforces maximum input lengths to prevent resource exhaustion
- **Prompt Injection Protection**: Removes malicious patterns that could manipulate AI behavior
- **Malicious Code Detection**: Filters dangerous script injection and command execution attempts
- **Whitespace Normalization**: Cleans up excessive whitespace and normalizes line endings
- **Empty Input Validation**: Ensures messages remain valid after sanitization

**Input Limits (defaults, agent config can override):**
- **User Messages**: Maximum 35,000 characters (~10,000 tokens)
- **System Prompts**: Maximum 210,000 characters (~60,000 tokens)
- **Minimum Length**: Messages must not be empty after sanitization

**Security Patterns Removed:**
- Chat format role markers (`<|system|>`, `<|assistant|>`, etc.)
- XML-style role tags (`<system>`, `<assistant>`, etc.)
- Prompt delimiter sequences (`=== END PROMPT ===`, etc.)
- Script injection attempts (`<script>`, `javascript:`, etc.)
- Command injection patterns (`rm -rf /`, etc.)
- SQL injection attempts (complex union attacks, etc.)
- Zero-width and control characters
- Base64-like encoded strings

**Implementation:**
- **Agent Routes**: Sanitization handled by `AgentsManager.executeAgent()`
- **Chat Routes**: Direct sanitization in route handlers
- **Validation**: Empty message validation occurs after sanitization
- **Error Handling**: Clear error messages for invalid inputs

See [sanitization.ts](src/utils/sanitization.ts) for detailed implementation and pattern definitions.

## Vector Embeddings and RAG

The Irmin AI service includes a comprehensive RAG (Retrieval Augmented Generation) implementation using vector embeddings and similarity search. This system enables AI agents to access relevant documentation and context for more accurate responses.

**Key Features:**
- **Document Vectorization**: Process both remote URLs and local LLM documentation files (`llm-docs/*.md` files)
- **Vector Store Management**: Create and manage Qdrant vector collections with automatic chunking
- **Similarity Search**: Find relevant documents using OpenAI embeddings and vector similarity
- **Context Retrieval**: Prepare retrieved content for LLM generation with token limits
- **REST API**: Complete API endpoints for collection management, document indexing, and search operations

**Setup:**
- **Qdrant**: Run locally with `docker run -p 6333:6333 -p 6334:6334 qdrant/qdrant`
- **Web UI**: Access dashboard at `http://localhost:6333/dashboard`
- **Environment**: Set `QDRANT_URL` and `OPENAI_API_KEY` environment variables

See [Vector Services Documentation](src/vector/README.md) for detailed RAG implementation guide and API usage examples.

### Embeddings API

The Embeddings API provides REST endpoints for vector store management, document indexing, and similarity search operations. It includes both user-scoped endpoints (`/api/embeddings`) and system-level endpoints (`/api/system/embeddings`) for administrative operations.

**Key Features:**
- **Collection Management**: Create, update, and delete vector collections
- **Document Indexing**: Add documents to collections with automatic chunking and embedding
- **Similarity Search**: Search for relevant documents using vector similarity
- **Context Retrieval**: Prepare retrieved content for LLM generation
- **Embedding Generation**: Create embeddings using collection-specific models

**API Endpoints:**
- **Collections** (`/api/embeddings/collections`) - CRUD operations for vector collections
- **Documents** (`/api/embeddings/collections/:id/documents`) - Index documents in collections
- **Search** (`/api/embeddings/collections/:id/search`) - Similarity search within collections
- **Context** (`/api/embeddings/collections/:id/retrieve-context`) - Retrieve context for generation
- **System Endpoints** (`/api/system/embeddings/*`) - Administrative operations

See [Vector Services Documentation](src/vector/README.md) for detailed RAG implementation guide.

## Agents

A specialized AI agents framework built on top of the existing LLM services, providing structured, configurable agents for different AI tasks. This system leverages the `llmService`, `mcpService`, and `completionService` to create focused AI assistants with specific capabilities and behaviors.

**Note:** Agent chaining will be implemented using [LangGraph.js](https://langchain-ai.github.io/langgraphjs) for complex workflow orchestration in future versions.

See [agents/README.md](src/agents/README.md) for more details.

## Database

Uses PostgreSQL with Drizzle ORM. Tables:
- `conversations` - Chat conversations (isolated by workspace and user)
- `messages` - Individual messages with token usage
- `ai_models` - Available AI models and pricing
- `analytics` - Usage tracking and events

**Setup:**
1. Set up a PostgreSQL database
2. Set the `DATABASE_URL` environment variable
3. Run migrations: `pnpm db:generate && pnpm db:migrate`

### Workspace-Based Access Control

All conversations are associated with a specific workspace and user:
- **User Isolation**: Users can only access conversations they created
- **Workspace Isolation**: Conversations are scoped to the workspace specified in the `X-Workspace-Slug` header
- **Access Control**: All API endpoints verify workspace access before processing requests
- **Billing Attribution**: All operations are properly attributed to the correct workspace for billing purposes

## MCP Tools

Model Context Protocol tools provide external tool access. Configure in `src/services/mcp.ts`.

## Docker

> For the best Docker experience on macOS, we recommend using [OrbStack](https://orbstack.dev/) instead of Docker Desktop. 

### Docker Compose Setup

The project includes a `docker-compose.yml` file for running the complete Irmin infrastructure locally. This includes:

- **API Service** (`irmin_ai`) - The main Irmin AI API
- **PostgreSQL Database** (`db_ai`) - Irmin AI Application database
- **Qdrant** (`qdrant`) - Vector database

#### Running Local Infrastructure

To start only the infrastructure services (database and vector database):

```bash
docker compose up -d db_ai qdrant
```

This command runs the services in detached mode (`-d`) and includes:
- PostgreSQL database on port 5436
- Qdrant on port 6333

#### Running the Complete Stack

To run the entire application stack including the API, database and vector database:

```bash
docker compose up -d
```

#### Stopping Services

```bash
# Stop all services
docker compose down

# Stop and remove volumes (WARNING: This will delete all data)
docker compose down -v
```

### Dockerfile Usage

#### Building the Image

```bash
# Build the Docker image
docker build -t irmin-ai .

# Run the container, injecting your local .env file for configuration
docker run -p 3001:3000 --env-file .env irmin-ai
```

#### Multi-Platform Builds

For production deployments across different architectures:

```bash
# Create and use buildx builder
docker buildx create --use

# Verify Buildx is active
docker buildx ls

# Build for multiple platforms
docker buildx build --platform linux/amd64/v2,linux/arm64/v8 -t YOUR_DOCKER_USERNAME/irmin-ai:latest --push .

# Run the container, injecting your local .env file for configuration
docker run -p 3001:3000 --env-file .env irmin-ai
```
