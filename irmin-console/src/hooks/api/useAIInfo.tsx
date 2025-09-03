import { useQuery } from '@tanstack/react-query';

import IrminAIClient from '@/lib/ai';
import { aiModelsQueryKey, aiToolsQueryKey } from '@/lib/queryKeys';

import { useIAM } from '@/context/IAMContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { AIModelsResponse, AIToolsResponse } from '@/types/ai/responses';

export function useAIInfo() {
  const { getToken } = useIAM();
  const { workspaceSlug } = useWorkspaceContext();

  // Query for fetching available AI models
  const modelsQuery = useQuery<AIModelsResponse>({
    queryKey: aiModelsQueryKey(workspaceSlug),
    queryFn: async () => {
      const token = await getToken();
      const client = new IrminAIClient(token, workspaceSlug);
      const models = await client.info.listModels();
      return models;
    },
  });

  // Query for fetching available tools
  const toolsQuery = useQuery<AIToolsResponse>({
    queryKey: aiToolsQueryKey(workspaceSlug),
    queryFn: async () => {
      const token = await getToken();
      const client = new IrminAIClient(token, workspaceSlug);
      const tools = await client.info.listTools();
      return tools;
    },
  });

  return {
    // Queries
    modelsQuery,
    toolsQuery,
  };
}
