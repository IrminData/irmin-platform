import { useQuery } from '@tanstack/react-query';

import IrminCore from '@/lib/core';
import { scriptTemplatesQueryKey } from '@/lib/queryKeys';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { Template } from '@/types/core/Template';

export function useScriptTemplates() {
  const { getToken } = useIAM();
  const { locale } = useLocale();
  const { workspaceSlug } = useWorkspaceContext();

  const scriptTemplatesQuery = useQuery<IrminAPIResponse<Template[]>, Error>({
    queryKey: scriptTemplatesQueryKey(workspaceSlug),
    queryFn: async () => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.scriptsService.listScriptTemplates({
        workspace: workspaceSlug,
      });
    },
  });

  return {
    scriptTemplatesQuery,
  };
}
