import { useMutation, useQuery } from '@tanstack/react-query';

import IrminAIClient from '@/lib/ai';
import { aiAgentConfigQueryKey, aiAgentsListQueryKey } from '@/lib/queryKeys';

import { useIAM } from '@/context/IAMContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { AIAgent } from '@/types/ai/base';
import type { AIAgentExecuteRequest } from '@/types/ai/requests';
import type {
  AIAgentExecuteResponse,
  AIAgentsListResponse,
} from '@/types/ai/responses';

export function useAIAgent(agentId?: string) {
  const { getToken } = useIAM();
  const { irminAlert } = usePopup();
  const { workspaceSlug } = useWorkspaceContext();

  // Query for fetching all available agents
  const agentsListQuery = useQuery<AIAgentsListResponse>({
    queryKey: aiAgentsListQueryKey(workspaceSlug),
    queryFn: async () => {
      const token = await getToken();
      const client = new IrminAIClient(token, workspaceSlug);
      const agents = await client.agents.listAgents();
      return agents;
    },
  });

  // Query for fetching a specific agent's configuration
  const agentConfigQuery = useQuery<AIAgent>({
    queryKey: aiAgentConfigQueryKey(workspaceSlug, agentId ?? ''),
    queryFn: async () => {
      if (!agentId) throw new Error('Agent ID is required');
      const token = await getToken();
      const client = new IrminAIClient(token, workspaceSlug);
      const agentConfig = await client.agents.getAgentConfig(agentId);
      return agentConfig;
    },
    enabled: !!agentId,
  });

  // Mutation for executing an agent (non-streaming)
  const executeAgentMutation = useMutation<
    AIAgentExecuteResponse,
    Error,
    { agentId: string; request: AIAgentExecuteRequest }
  >({
    mutationFn: async ({ agentId: execAgentId, request }) => {
      const token = await getToken();
      const client = new IrminAIClient(token, workspaceSlug);
      const response = await client.agents.executeAgent(execAgentId, request);
      return response;
    },
    onError: (error) => {
      irminAlert('error', error.message ?? 'Failed to execute agent');
    },
    onSuccess: () => {
      irminAlert('success', 'Agent executed successfully');
    },
  });

  // Mutation for executing an agent with streaming
  const executeAgentStreamMutation = useMutation<
    { stream: ReadableStream<Uint8Array>; conversationId?: string },
    Error,
    { agentId: string; request: AIAgentExecuteRequest }
  >({
    mutationFn: async ({ agentId: execAgentId, request }) => {
      const token = await getToken();
      const client = new IrminAIClient(token, workspaceSlug);
      const stream = await client.agents.executeAgentStream(
        execAgentId,
        request
      );
      return stream;
    },
    onError: (error) => {
      irminAlert('error', error.message ?? 'Failed to execute agent stream');
    },
  });

  // Helper function to execute agent with automatic agentId
  const executeAgent = (request: AIAgentExecuteRequest) => {
    if (!agentId) {
      irminAlert('error', 'No agent ID specified');
      return;
    }
    executeAgentMutation.mutate({ agentId, request });
  };

  // Helper function to execute agent stream with automatic agentId
  const executeAgentStream = (request: AIAgentExecuteRequest) => {
    if (!agentId) {
      irminAlert('error', 'No agent ID specified');
      return;
    }
    executeAgentStreamMutation.mutate({ agentId, request });
  };

  // Helper function to execute any agent by ID
  const executeAgentById = (
    execAgentId: string,
    request: AIAgentExecuteRequest
  ) => {
    executeAgentMutation.mutate({ agentId: execAgentId, request });
  };

  // Helper function to execute any agent stream by ID
  const executeAgentStreamById = (
    execAgentId: string,
    request: AIAgentExecuteRequest
  ) => {
    executeAgentStreamMutation.mutate({ agentId: execAgentId, request });
  };

  return {
    // Queries
    agentsListQuery,
    agentConfigQuery,

    // Mutations
    executeAgentMutation,
    executeAgentStreamMutation,

    // Agent execution helper functions
    executeAgent,
    executeAgentStream,
    executeAgentById,
    executeAgentStreamById,
  };
}
