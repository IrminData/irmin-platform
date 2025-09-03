import { AIChatRequest, AIChatRequestSchema } from '@/types/ai/requests';
import { AIChatResponse, AIChatResponseSchema } from '@/types/ai/responses';

import { BaseClient } from './BaseClient';

export class ChatClient extends BaseClient {
  async chat(
    request: AIChatRequest
  ): Promise<AIChatResponse | ReadableStream<Uint8Array>> {
    const validatedRequest = AIChatRequestSchema.parse(request);

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(validatedRequest),
    });

    if (validatedRequest.stream) {
      return this.handleStreamResponse(response);
    } else {
      return this.handleResponse(response, AIChatResponseSchema);
    }
  }
}
