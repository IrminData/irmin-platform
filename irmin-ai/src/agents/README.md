# AI Agents System

Irmin AI ships with a lightweight agents framework that wraps LangChain’s `createAgent` API. It adds workspace-aware validation, persistent memory (via LangGraph checkpointer), input sanitization, and optional MCP tool loading on top of the core LLM services.

## Core pieces

- `AgentsManager` – registers all agents, validates workspace/user context, manages conversations, sanitizes messages, and orchestrates execution
- `BaseAgent` – shared implementation that builds a LangChain agent, prepares context, and exposes overridable hooks (`getAgentOptions`, `prepareContext`, `execute`)
- `AgentService` – internal singleton that configures LangGraph’s Postgres saver, invokes/streams agents, and retrieves agent state
- `AgentConfig` – minimal per-agent metadata (`id`, `name`, `description`, `contextRequirements`) that powers discovery endpoints and validation

### Execution flow

1. `AgentsManager.executeAgent` receives an `AgentInput` containing `message`, optional `conversationId`, optional `context`, plus authenticated `workspace` and `user` objects supplied by Fastify middleware.
2. Existing conversations are validated to ensure they belong to the caller; new conversations are created with fallback titles and stored in Postgres.
3. Messages are sanitized via `textSanitizer` (prompt-injection patterns stripped, max length enforced). Empty results are rejected.
4. The target `BaseAgent` subclass builds a LangChain agent:
   - Retrieves per-agent LLM configuration, middleware, and tool selection via `getAgentOptions`
   - Prepares additional context via `prepareContext`
   - Generates a system prompt using `SystemPromptBuilder`
   - Creates the LangChain agent with the Postgres checkpointer
5. The agent is invoked or streamed. The resulting stream/content is returned along with the authoritative `conversationId` and sanitized message content.
6. Conversation metadata (`updatedAt`) is refreshed and async title generation is kicked off for non-streaming responses.

### Streaming responses

- Agents expose LangChain v2 `StreamEvent` streams (`ReadableStream<StreamEvent>`). The Fastify route converts them to NDJSON.
- The assistant agent always streams (its `AgentResponse.content` is intentionally empty).
- Non-streaming agents return populated `content` fields and no stream.

## Built-in agents

### `assistant`
- Anthropic Claude Sonnet 4.5 (streaming, thinking tokens enabled) with Groq/OpenAI fallbacks
- Optional MCP tool loading when `authToken` is present
- Summarization + tool selector middleware to manage long conversations and reduce tool calls
- Vector-backed context enrichment via `retrievalService.retrieveWithHypotheticalContent` against the `irmin-docs` collection

```typescript
const { agentResponse, conversationId } = await agentsManager.executeAgent('assistant', {
  message: 'Summarize the key Irmin workflows for me.',
  conversationId: existingConversationId,
  authToken: request.headers.authorization?.replace('Bearer ', ''),
  workspace: request.workspace.workspace,
  user: request.auth.user,
});

// agentResponse.stream is a ReadableStream<StreamEvent>
// agentResponse.metadata?.conversationId mirrors conversationId
```

### `query`
- Groq Llama 3.3 70B Versatile
- Requires `contextRequirements` (repository slug, object path, optional ref); these are validated before execution
- Returns synchronous JSON/SQL content (`AgentResponse.content`)

```typescript
const { agentResponse } = await agentsManager.executeAgent('query', {
  message: 'List the five most recently updated objects.',
  context: { 
    repository_slug: 'analytics-repo',
    object_path: '/data/sales/orders.csv',
  },
  workspace: request.workspace.workspace,
  user: request.auth.user,
});

console.log(agentResponse.content);
```

### `scripting`
- Groq Llama 3.3 70B Versatile
- Generates Go snippets for Irmin automation tasks
- Returns synchronous code blocks (`AgentResponse.content`)

```typescript
const { agentResponse } = await agentsManager.executeAgent('scripting', {
  message: 'Create a Go script that exports repository metadata to JSON.',
  workspace: request.workspace.workspace,
  user: request.auth.user,
});

console.log(agentResponse.content);
```

## Extending the framework

1. **Define configuration**
```typescript
   // src/agents/my-agent/config.ts
   import { AgentConfig } from '@/agents/types';

export const myAgentConfig: AgentConfig = {
  id: 'my-agent',
  name: 'My Custom Agent',
     description: 'Specialized agent for X tasks',
     contextRequirements: [
       { name: 'dataset', description: 'Dataset identifier', required: true },
     ],
};
```

2. **Create a system prompt (optional)** – add `src/agents/my-agent/system-prompt.txt` or rely on the config description fallback.

3. **Implement the agent**
```typescript
   // src/agents/my-agent/index.ts
import { BaseAgent } from '@/agents/base';
   import { AgentInput } from '@/agents/types';
import { myAgentConfig } from './config';

export class MyAgent extends BaseAgent {
  constructor() {
    super(myAgentConfig);
  }

     protected async getAgentOptions(input: AgentInput) {
       return {
         llmOptions: {
           provider: 'groq',
           model: 'llama-3.3-70b-versatile',
           temperature: 0.5,
         },
         // Return tools or middleware if needed
       };
     }

     protected async prepareContext(input: AgentInput) {
       const context = await super.prepareContext(input);
       // Add custom context (e.g., vector lookups) here
    return context;
  }
   }
   ```

4. **Register the agent** – add `new MyAgent()` inside the `AgentsManager` constructor.

## Conversation history helpers

`AgentsManager.getConversationHistory(agentId, conversationId)` uses the LangGraph checkpointer to fetch the stored message array (`BaseMessage[]`). This is useful for debugging or building custom response pipelines.

## Tool access

- The assistant agent automatically loads MCP tools when an `authToken` is supplied.
- Other agents currently run without tools; add tool loading in `getAgentOptions` as needed.
- Request-level control of tool inclusion/exclusion can be added by extending agent inputs; see `AssistantAgent.getAgentOptions` for a reference implementation.

## API routes overview

Fastify exposes the following agent routes (see `src/routes/agents.ts`):
- `GET /api/agents` – list registered agents (`AgentConfig[]`)
- `GET /api/agents/:agentId/config` – fetch config for a single agent
- `POST /api/agents/:agentId` – execute an agent (non-streaming response)
- `POST /api/agents/:agentId/stream` – execute an agent and stream LangChain events (NDJSON)

These routes rely on authentication/workspace middleware to populate `request.auth` and `request.workspace`, which must then be passed to `AgentsManager.executeAgent` as shown in the built-in route handlers.
