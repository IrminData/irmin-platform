# AI Agents System

Irmin AI wraps LangChain’s `createAgent` API with workspace-aware validation, persistent LangGraph memory, provider-neutral inference roles, and optional MCP tool loading.

## Core pieces

- `AgentsManager` – registers agents and delegates execution to the deep runtime modules
- `AgentRunner` – preserves normalized user content, propagates cancellation, and owns successful completion
- `ContextAssembler` – applies role budgets plus provenance/trust labels
- `SpecialistRunner` – returns typed SQL, Go, or clarification results after validation
- `ConversationStore` – owns relational metadata and LangGraph thread lifecycle
- `ToolCatalog` – selects transport tools by capability rather than literal MCP names in agents
- `BaseAgent` – shared implementation that builds a LangChain agent, prepares context, and exposes overridable hooks (`getAgentOptions`, `prepareContext`, `execute`)
- `AgentService` – internal singleton that configures LangGraph’s Postgres saver, invokes/streams agents, and retrieves agent state
- `InferenceGateway` – resolves a role from the reviewed model profile, installs telemetry, and hides provider/model options from callers
- `AgentConfig` – minimal per-agent metadata (`id`, `name`, `description`, `contextRequirements`) that powers discovery endpoints and validation

### Execution flow

1. `AgentsManager.executeAgent` receives an `AgentInput` containing `message`, optional `conversationId`, optional `context`, plus authenticated `workspace` and `user` objects supplied by Fastify middleware.
2. Existing conversations are validated to ensure they belong to the caller; new conversations are created with fallback titles and stored in Postgres.
3. Messages are NFC/line-ending normalized and bounded without destructive rewriting.
4. The target `BaseAgent` subclass builds a LangChain agent:
   - Resolves an inference role, middleware, and tool selection via `getAgentOptions`
   - Prepares additional context via `prepareContext`
   - Generates a system prompt using `SystemPromptBuilder`
   - Creates the LangChain agent with the Postgres checkpointer
5. The agent is invoked or streamed. The resulting content is normalized to `RunEventV1` before it crosses the HTTP boundary.
6. After the first successful response, title generation is atomically claimed once; failed and cancelled runs never trigger it.

### Streaming responses

- Internally, agents expose LangChain streams. The Fastify route converts them to provider-neutral `RunEventV1` NDJSON envelopes.
- The assistant agent always streams (its `AgentResponse.content` is intentionally empty).
- Non-streaming agents return populated `content` fields and no stream.

## Built-in agents

### `assistant`

- Uses the `assistant` role from the active model profile
- Optional MCP tool loading when `authToken` is present
- Summarization + tool selector middleware to manage long conversations and reduce tool calls
- Vector-backed context enrichment via `retrievalService.retrieveWithHypotheticalContent` against the `irmin-docs` collection

```typescript
const { agentResponse, conversationId } = await agentsManager.executeAgent(
  'assistant',
  {
    message: 'Summarize the key Irmin workflows for me.',
    conversationId: existingConversationId,
    authToken: request.headers.authorization?.replace('Bearer ', ''),
    workspace: request.workspace.workspace,
    user: request.auth.user,
  }
);

// agentResponse.stream is normalized to RunEventV1 NDJSON at the route
// agentResponse.metadata?.conversationId mirrors conversationId
```

### `query`

- Uses the `query` inference role
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

- Uses the `scripting` inference role
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

  protected async getAgentOptions(_input: AgentInput) {
    return {
      modelRole: 'assistant' as const,
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
- `POST /api/agents/:agentId/stream` – execute an agent and stream `RunEventV1` envelopes (NDJSON)

These routes rely on authentication/workspace middleware to populate `request.auth` and `request.workspace`, which must then be passed to `AgentsManager.executeAgent` as shown in the built-in route handlers.
