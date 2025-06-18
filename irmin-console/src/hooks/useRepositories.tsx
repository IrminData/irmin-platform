import { useMutation, useQuery } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';

import IrminCore from '@/lib/core';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { Repository } from '@/types/core/Repository';

export const repositoriesQueryKey = (workspaceSlug: string) =>
  ['repositories', workspaceSlug] as const;

export type RepositoryCreateInput = {
  name: string;
  description: string;
  documentation: string;
  default_branch: string;
  isImmutable: boolean;
  garbageDefaultRetentionDays?: number;
  garbageDefaultBranchRetentionDays?: number;
};

export function useRepositories() {
  const { getToken } = useIAM();
  const { locale } = useLocale();
  const { irminAlert } = usePopup();
  const { workspaceSlug } = useWorkspaceContext();
  const queryClient = useQueryClient();

  const repositoriesQuery = useQuery<IrminAPIResponse<Repository[]>, Error>({
    queryKey: repositoriesQueryKey(workspaceSlug),
    queryFn: async () => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.repositoryService.fetchRepositories({
        workspace: workspaceSlug,
      });
    },
  });

  const createRepositoryMutation = useMutation<
    IrminAPIResponse,
    Error,
    RepositoryCreateInput
  >({
    mutationFn: async (data) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.repositoryService.createRepository({
        workspace: workspaceSlug,
        name: data.name,
        description: data.description,
        documentation: data.documentation,
        defaultBranch: data.default_branch,
        isImmutable: data.isImmutable,
        garbageDefaultRetentionDays: data.garbageDefaultRetentionDays,
        garbageDefaultBranchRetentionDays:
          data.garbageDefaultBranchRetentionDays,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({
        queryKey: repositoriesQueryKey(workspaceSlug),
      });
      queryClient.invalidateQueries({
        queryKey: repositoriesQueryKey(workspaceSlug),
      });
      irminAlert('success', res.message ?? 'Repository created successfully');
    },
    onError: (error) => {
      console.error(error);
      irminAlert('error', error.message ?? 'Error creating repository');
    },
  });

  return {
    // Queries
    repositoriesQuery,

    // Mutations
    createRepositoryMutation,
  };
}
