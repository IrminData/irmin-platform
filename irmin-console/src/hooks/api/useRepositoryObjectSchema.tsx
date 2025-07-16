import { useQuery } from '@tanstack/react-query';

import IrminCore from '@/lib/core';
import { repositoryObjectSchemaQueryKey } from '@/lib/queryKeys';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

export const useRepositoryObjectSchema = (
  repositorySlug: string,
  ref?: string,
  path?: string
) => {
  const { getToken } = useIAM();
  const { locale } = useLocale();
  const { workspaceSlug } = useWorkspaceContext();

  const repositoryObjectSchemaQuery = useQuery({
    queryKey: repositoryObjectSchemaQueryKey(
      workspaceSlug,
      repositorySlug,
      ref ?? '',
      path ?? ''
    ),
    queryFn: async () => {
      const token = await getToken();
      const irminCore = new IrminCore(locale, token);
      return irminCore.objectService.getObjectSchema({
        workspace: workspaceSlug,
        repository: repositorySlug,
        path: path ?? '',
        ref: ref ?? '',
      });
    },
  });

  return {
    //Query
    repositoryObjectSchemaQuery,
  };
};
