import { useMutation } from '@tanstack/react-query';

import IrminCore from '@/lib/core';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

export function useIrminSQL() {
  const { getToken } = useIAM();
  const { locale } = useLocale();
  const { workspaceSlug } = useWorkspaceContext();

  const executeSQLMutation = useMutation({
    mutationFn: async ({
      sql,
      limitResponse,
    }: {
      sql: string;
      limitResponse?: boolean;
    }) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.queryService.executeSQL({
        workspace: workspaceSlug,
        sql,
        limitResponse,
      });
    },
  });

  return {
    executeSQLMutation,
  };
}
