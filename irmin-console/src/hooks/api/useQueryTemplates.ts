import { useQuery } from '@tanstack/react-query';

import { queryTemplatesQueryKey } from '@/lib/queryKeys';

import { useIrminCore } from '@/context/IrminCoreContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { Template } from '@/types/core/Template';

export function useQueryTemplates() {
  const { getCore } = useIrminCore();
  const { workspaceSlug } = useWorkspaceContext();

  const queryTemplatesQuery = useQuery<IrminAPIResponse<Template[]>, Error>({
    queryKey: queryTemplatesQueryKey(workspaceSlug),
    queryFn: async () => {
      const core = await getCore();
      return await core.queryService.listQueryTemplates({
        workspace: workspaceSlug,
      });
    },
  });

  return {
    queryTemplatesQuery,
  };
}
