# AI Agents System

A specialized AI agents framework built on top of the existing LLM services, providing structured, configurable agents for different AI tasks. This system leverages the `llmService`, `mcpService`, and `completionService` to create focused AI assistants with specific capabilities and behaviors.

## Features

- **Service Integration**: Built on the existing LLM, MCP, and completion services
- **Multiple Agent Types**: Chat and single-shot agents
- **Completion Support**: Full completion response support via LangChain streams (compatible with Vercel AI SDK)
- **MCP Tools**: Automatic integration with the MCP tools configuration
- **Model Flexibility**: Support for OpenAI and Groq models via the model selector
- **Context Management**: Vector stores, conversation history (fetched from database), and custom contexts
- **Memory Management**: Uses conversationId for persistent memory across sessions
- **Type Safety**: Full TypeScript support with comprehensive interfaces

## Future Considerations

- **Agent Chaining**: Implementing [LangGraph.js](https://langchain-ai.github.io/langgraphjs) for complex agent workflows and orchestration
- **Agent Thinking**: Agent specify thinking capabilities, but we don't use it yet.

## Quick Start

```typescript
import { AgentsManager } from './agents';

const agentsManager = new AgentsManager();

// Execute chat agent
const response = await agentsManager.executeAgent('chat', {
  message: "Help me understand microservices architecture",
  authToken: "your-irmin-auth-token",
  conversationId: "conv-123"
});

console.log(response.content);
```

## Architecture

The agents system is a specialized layer that sits on top of the existing services:

```
┌─────────────────┐
│   Agents Layer  │  ← New specialized agents
├─────────────────┤
│ Streaming Svc   │  ← The existing services
│ LLM Service     │
│ MCP Service     │  
└─────────────────┘
```

### Streaming Implementation

The agents now pass through LangChain streams directly instead of converting them to Web ReadableStreams. This approach:

- **Eliminates redundancy**: No need to convert between stream types
- **Vercel AI SDK compatibility**: Works seamlessly with Vercel AI SDK for client-side streaming
- **Better performance**: Direct stream handling without conversion overhead
- **LangChain native**: Maintains full compatibility with LangChain ecosystem

## Folder Structure

```
/agents
├── agents.ts                    # Main orchestrator
├── types.ts                     # Type definitions
├── base/                        # Base implementations
│   ├── index.ts                 # Base agent implementation class to extend from
├── utils/                       # Agent-specific utilities
│   ├── context-manager.ts      # Context preparation
└── [agent-name]/               # Individual agents
    ├── index.ts                # Agent implementation
    ├── config.ts               # Agent configuration
    └── system-prompt.txt       # System prompt
```

## Built-in Agents

### Chat Agent
General-purpose chat agent with full MCP tools access.

```typescript
const response = await agentsManager.executeAgent('chat', {
  message: "What's the weather like and can you help me write some code?",
  authToken: token,
  conversationHistory: messages
});
```

**Features:**
- Full MCP tools integration
- Streaming responses
- Conversation history awareness
- Thinking enabled

### Query Agent
Converts natural language to SQL queries.

```typescript
const response = await agentsManager.executeAgent('query', {
  message: "Show me users who registered in the last 30 days",
  context: { 
    schema: databaseSchema 
  },
  conversationId: "conv-123"
});
```

**Features:**
- Database schema awareness
- Optimized for precision (low temperature)
- Structured JSON responses
- Fast Groq model for quick results

### Scripting Agent
Generates Go scripts from natural language descriptions.

```typescript
const response = await agentsManager.executeAgent('scripting', {
  message: "Create a HTTP server with rate limiting and JWT auth",
  context: { 
    projectStructure: {...}
  },
  conversationId: "conv-123"
});
```

**Features:**
- Go language specialization
- Project context awareness
- Code best practices
- Thinking enabled for complex logic

### Title Generation Agent
Creates concise titles for conversations.

```typescript
const response = await agentsManager.executeAgent('title-generation', {
  message: "How do I optimize database queries for large datasets?",
  conversationId: "conv-123"
});
```

**Features:**
- Ultra-fast responses
- Minimal token usage
- No tools required
- Optimized for brevity

## Creating Custom Agents

### 1. Define Agent Configuration

```typescript
// agents/my-agent/config.ts
import { AgentConfig } from '../types';

export const myAgentConfig: AgentConfig = {
  id: 'my-agent',
  name: 'My Custom Agent',
  description: 'Specialized agent for specific tasks',
  type: 'single-shot',
  modelProvider: 'openai',
  model: 'gpt-4-turbo',
  temperature: 0.5,
  maxTokens: 2000,
  responseFormat: 'structured',
  contextRequirements: [
    {
      type: 'vector',
      name: 'knowledge_base',
      required: true
    }
  ],
  thinkingEnabled: true,
  useTools: false,
  streaming: false
};
```

### 2. Create System Prompt

```txt
// agents/my-agent/system-prompt.txt
You are a specialized AI assistant focused on [specific domain].

Your capabilities:
- Task 1: Description
- Task 2: Description

Guidelines:
- Always provide structured responses
- Include reasoning for complex decisions
- Format code blocks properly

Response format:
- Use JSON structure when requested
- Include confidence levels for recommendations
```

### 3. Implement Agent

```typescript
// agents/my-agent/index.ts
import { BaseAgent } from '@/agents/base';
import { AgentInput, AgentResponse } from '@/agents/types';
import { myAgentConfig } from './config';

export class MyAgent extends BaseAgent {
  constructor() {
    super(myAgentConfig);
  }

  // Override if you need custom logic
  async prepareContext(input: AgentInput): Promise<Record<string, any>> {
    const context = await super.prepareContext(input);
    
    // Add custom context preparation
    if (input.context?.specialData) {
      context.processedData = await this.processSpecialData(input.context.specialData);
    }
    
    return context;
  }

  private async processSpecialData(data: any) {
    // Custom processing logic
    return data;
  }
}
```

### 4. Register Agent

```typescript
// agents/agents.ts
import { MyAgent } from '@/agents/my-agent';

constructor() {
  // ... existing agents
  this.registerAgent(new MyAgent());
}
```

## API Integration

### Fastify.js API Routes

```typescript
import Fastify from 'fastify';
import { AgentsManager } from '@/agents';

const fastify = Fastify({ logger: true });
const agentsManager = new AgentsManager();

// Non-streaming execution
fastify.post('/api/agents/:agentId', async (request, reply) => {
  try {
    const { agentId } = request.params as { agentId: string };
    const authToken = (request.headers.authorization as string)?.replace('Bearer ', '');
    
    const response = await agentsManager.executeAgent(agentId, {
      ...request.body,
      authToken
    });
    
    return reply.send(response);
  } catch (error) {
    return reply.status(400).send({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Streaming execution
fastify.post('/api/agents/:agentId/stream', async (request, reply) => {
  try {
    const { agentId } = request.params as { agentId: string };
    const authToken = (request.headers.authorization as string)?.replace('Bearer ', '');
    
    const response = await agentsManager.executeAgent(agentId, {
      ...request.body,
      authToken
    });
    
    if (response.stream) {
      reply.type('text/event-stream');
      reply.header('Cache-Control', 'no-cache');
      reply.header('Connection', 'keep-alive');
      
      // Handle LangChain stream directly
      try {
        for await (const chunk of response.stream) {
          const content = chunk.content;
          if (content && typeof content === 'string') {
            reply.raw.write(`data: ${content}\n\n`);
          }
        }
        reply.raw.write('data: [DONE]\n\n');
        reply.raw.end();
      } catch (error) {
        reply.raw.write(`data: {"error": "${error instanceof Error ? error.message : 'Stream error'}"}\n\n`);
        reply.raw.end();
      }
    } else {
      return reply.send(response);
    }
  } catch (error) {
    return reply.status(400).send({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// List available agents
fastify.get('/api/agents', async (request, reply) => {
  const agents = agentsManager.listAgents();
  return reply.send(agents);
});

// Get available models
fastify.get('/api/models', async (request, reply) => {
  const models = agentsManager.getAvailableModels();
  return reply.send(models);
});

// MCP status
fastify.get('/api/mcp/status', async (request, reply) => {
  const status = agentsManager.getMcpStatus();
  return reply.send(status);
});

// Health check for agents
fastify.get('/api/agents/health', async (request, reply) => {
  const agents = agentsManager.listAgents();
  const mcpStatus = agentsManager.getMcpStatus();
  const models = agentsManager.getAvailableModels();
  
  return reply.send({
    status: 'healthy',
    agentsCount: agents.length,
    agents: agents.map(a => ({ id: a.id, name: a.name, type: a.type })),
    mcp: mcpStatus,
    modelsCount: models.length
  });
});
```

## Advanced Usage

### Custom Context Example
```typescript
const response = await agentsManager.executeAgent('assistant', {
  message: "Help me optimize this code",
  context: {
    codeBase: await vectorStore.search("optimization patterns"),
    userPreferences: { language: "go", style: "clean" }
  },
  conversationId: "conv-123",
  authToken: userToken
});
```

## Error Handling

```typescript
try {
  const response = await agentsManager.executeAgent('assistant', input);
} catch (error) {
  if (error.message.includes('not found')) {
    // Agent doesn't exist
  } else if (error.message.includes('Invalid input')) {
    // Input validation failed
  } else if (error.message.includes('MCP')) {
    // MCP tool error
  } else {
    // Model or service error
  }
}
```

## Performance & Monitoring

### Usage Tracking
```typescript
const response = await agentsManager.executeAgent('assistant', input);
console.log('Usage:', response.usage);
// {
//   promptTokens: 150,
//   completionTokens: 300,
//   totalTokens: 450
// }
```

### MCP Status Monitoring
```typescript
const status = agentsManager.getMcpStatus();
console.log('MCP Status:', status);
// {
//   enabled: true,
//   configStatus: {
//     enabled: true,
//     serverCount: 1,
//     configKeys: ["irmin"]
//   }
// }
```
