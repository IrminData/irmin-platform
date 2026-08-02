import { AIAgentSchema } from '@/types/ai/base';
import {
  AIAgentExecuteRequest,
  AIAgentExecuteRequestSchema,
} from '@/types/ai/requests';
import {
  AIAgentExecuteResponse,
  AIAgentExecuteResponseSchema,
  AIAgentsListResponseSchema,
} from '@/types/ai/responses';

import { BaseClient } from './BaseClient';

export class AgentsClient extends BaseClient {
  async listAgents() {
    const response = await fetch(`${this.baseUrl}/api/agents`, {
      headers: this.getHeaders(),
    });

    return this.handleResponse(response, AIAgentsListResponseSchema);
  }

  async executeAgent(
    agentId: string,
    request: AIAgentExecuteRequest
  ): Promise<{ data: AIAgentExecuteResponse; conversationId?: string }> {
    const validatedRequest = AIAgentExecuteRequestSchema.parse(request);

    const response = await fetch(`${this.baseUrl}/api/agents/${agentId}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(validatedRequest),
    });

    const conversationId =
      response.headers.get('X-Conversation-Id') ||
      response.headers.get('x-conversation-id') ||
      undefined;
    const data = await this.handleResponse(
      response,
      AIAgentExecuteResponseSchema
    );

    return { data, conversationId };
  }

  async executeAgentStream(
    agentId: string,
    request: AIAgentExecuteRequest
  ): Promise<{
    stream: ReadableStream<Uint8Array>;
    conversationId?: string;
  }> {
    const validatedRequest = AIAgentExecuteRequestSchema.parse(request);

    const response = await fetch(
      `${this.baseUrl}/api/agents/${agentId}/stream`,
      {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          // Hint server and intermediaries we expect a streaming NDJSON response
          Accept: 'application/x-ndjson',
        },
        body: JSON.stringify(validatedRequest),
      }
    );

    const stream = await this.handleStreamResponse(response);
    const conversationId =
      response.headers.get('X-Conversation-Id') ||
      response.headers.get('x-conversation-id') ||
      undefined;

    // Return raw stream - parsing will be done in Next.js API route
    return { stream, conversationId };
  }

  async getAgentConfig(agentId: string) {
    const response = await fetch(
      `${this.baseUrl}/api/agents/${agentId}/config`,
      {
        headers: this.getHeaders(),
      }
    );

    return this.handleResponse(response, AIAgentSchema);
  }
}
