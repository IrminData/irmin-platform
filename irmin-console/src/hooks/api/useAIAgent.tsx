import { useMutation } from '@tanstack/react-query';

import { useIAM } from '@/context/IAMContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { AIAgentExecuteRequest } from '@/types/ai/requests';

interface ExecuteAgentStreamResponse {
  stream: ReadableStream<Uint8Array>;
  conversationId?: string;
}

interface ExecuteAgentParams {
  agentId: string;
  request: AIAgentExecuteRequest;
}

export function useAIAgent(_agentId: string) {
  const { getToken } = useIAM();
  const { workspaceSlug } = useWorkspaceContext();

  const executeAgentStreamMutation = useMutation<
    ExecuteAgentStreamResponse,
    Error,
    ExecuteAgentParams
  >({
    mutationFn: async ({ agentId, request }: ExecuteAgentParams) => {
      const token = await getToken();

      const response = await fetch(
        `/api/ai/agent/${agentId}?workspaceSlug=${workspaceSlug}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(request),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to execute agent: ${response.statusText}`
        );
      }

      const conversationId =
        response.headers.get('X-Conversation-Id') ||
        response.headers.get('x-conversation-id') ||
        undefined;

      // Check if response is streaming
      const contentType = response.headers.get('Content-Type');
      if (
        contentType?.includes('application/x-ndjson') ||
        contentType?.includes('text/event-stream')
      ) {
        if (!response.body) {
          throw new Error('Response body is null');
        }
        return { stream: response.body, conversationId };
      }

      // Non-streaming response - convert to stream
      const data = await response.json();
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: 'text-delta',
                delta: data.content || data.message || '',
              }) + '\n'
            )
          );
          controller.enqueue(
            encoder.encode(JSON.stringify({ type: 'stream-complete' }) + '\n')
          );
          controller.close();
        },
      });

      return { stream, conversationId };
    },
  });

  return {
    executeAgentStreamMutation,
  };
}
