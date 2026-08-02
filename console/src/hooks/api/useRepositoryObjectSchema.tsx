import { useQuery } from '@tanstack/react-query';

import { repositoryObjectSchemaQueryKey } from '@/lib/queryKeys';

import { useIrminCore } from '@/context/IrminCoreContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

export const useRepositoryObjectSchemaQuery = (
  workspaceSlug: string,
  repositorySlug: string,
  ref?: string,
  path?: string,
  options?: { enabled?: boolean }
) => {
  const { getCore } = useIrminCore();

  return useQuery({
    enabled: options?.enabled,
    queryKey: repositoryObjectSchemaQueryKey(
      workspaceSlug,
      repositorySlug,
      ref ?? '',
      path ?? ''
    ),
    queryFn: async () => {
      const irminCore = await getCore();
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
