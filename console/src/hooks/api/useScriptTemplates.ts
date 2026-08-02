import { useQuery } from '@tanstack/react-query';

import { scriptTemplatesQueryKey } from '@/lib/queryKeys';

import { useIrminCore } from '@/context/IrminCoreContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { Template } from '@/types/core/Template';

export function useScriptTemplates() {
  const { getCore } = useIrminCore();
  const { workspaceSlug } = useWorkspaceContext();

  const scriptTemplatesQuery = useQuery<IrminAPIResponse<Template[]>, Error>({
    queryKey: scriptTemplatesQueryKey(workspaceSlug),
    queryFn: async () => {
      const core = await getCore();
      return await core.scriptsService.listScriptTemplates({
        workspace: workspaceSlug,
      });
    },
  });

  return {
    scriptTemplatesQuery,
  };
}
