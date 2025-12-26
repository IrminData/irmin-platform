import { useQuery } from '@tanstack/react-query';

import IrminCore from '@/lib/core';
import { repositoryObjectSchemaQueryKey } from '@/lib/queryKeys';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

export const useRepositoryObjectSchemaQuery = (
  workspaceSlug: string,
  repositorySlug: string,
  ref?: string,
  path?: string,
  options?: { enabled?: boolean }
) => {
  const { getToken } = useIAM();
  const { locale } = useLocale();

  return useQuery({
    enabled: options?.enabled,
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
};

export const useRepositoryObjectSchema = (
  repositorySlug: string,
  ref?: string,
  path?: string,
  options?: { enabled?: boolean }
) => {
  const { workspaceSlug } = useWorkspaceContext();

  const repositoryObjectSchemaQuery = useRepositoryObjectSchemaQuery(
    workspaceSlug,
    repositorySlug,
    ref,
    path,
    options
  );

  return {
    //Query
    repositoryObjectSchemaQuery,
  };
};
