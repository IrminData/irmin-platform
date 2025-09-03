import { z } from 'zod';

import { AIErrorSchema } from '@/types/ai/base';

export class BaseClient {
  protected baseUrl: string;
  protected token: string;
  protected workspaceSlug: string;

  constructor(token: string, workspaceSlug: string) {
    this.baseUrl =
      process.env.NEXT_PUBLIC_AI_API_URL ?? 'https://ai-api.irmin.dev';
    this.token = token;
    this.workspaceSlug = workspaceSlug;
  }

  protected getHeaders(): HeadersInit {
    return {
      Authorization: `Bearer ${this.token}`,
      'X-Workspace-Slug': this.workspaceSlug,
      'Content-Type': 'application/json',
    };
  }

  protected async handleResponse<T>(
    response: Response,
    schema: z.ZodSchema<T>
  ): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = AIErrorSchema.safeParse(errorData);

      if (error.success) {
        throw new Error(
          `API Error ${error.data.statusCode}: ${error.data.message}`
        );
      }

      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return schema.parse(data);
  }

  protected async handleStreamResponse(
    response: Response
  ): Promise<ReadableStream<Uint8Array>> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = AIErrorSchema.safeParse(errorData);

      if (error.success) {
        throw new Error(
          `API Error ${error.data.statusCode}: ${error.data.message}`
        );
      }

      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('No response body for streaming');
    }

    return response.body;
  }

  protected async handleDeleteResponse(response: Response): Promise<void> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = AIErrorSchema.safeParse(errorData);

      if (error.success) {
        throw new Error(
          `API Error ${error.data.statusCode}: ${error.data.message}`
        );
      }

      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }
  }
}
