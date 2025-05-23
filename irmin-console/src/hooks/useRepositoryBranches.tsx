import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';

import IrminCore from '@/lib/core';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { Branch } from '@/types/core/Branch';
import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

export const repositoryBranchesQueryKey = (
  workspaceSlug: string,
  slug: string
) => ['repositoryBranches', workspaceSlug, slug] as const;

export function useRepositoryBranches(repositorySlug: string) {
  const { getToken } = useIAM();
  const { locale } = useLocale();
  const { irminAlert } = usePopup();
  const { workspaceSlug } = useWorkspaceContext();
  const queryClient = useQueryClient();

  const repositoryBranchesQuery = useQuery<IrminAPIResponse<Branch[]>, Error>({
    queryKey: repositoryBranchesQueryKey(workspaceSlug, repositorySlug),
    queryFn: async () => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.branchService.fetchBranches({
        workspace: workspaceSlug,
        repository: repositorySlug,
      });
    },
  });

  const createBranchMutation = useMutation<
    IrminAPIResponse,
    Error,
    { name: string; from: string }
  >({
    mutationFn: async (data) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.branchService.createBranch({
        workspace: workspaceSlug,
        repository: repositorySlug,
        name: data.name,
        from: data.from,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({
        queryKey: repositoryBranchesQueryKey(workspaceSlug, repositorySlug),
      });
      irminAlert('success', res.message ?? 'Branch created successfully');
    },
    onError: (error) => {
      console.error(error);
      irminAlert('error', error.message ?? 'Error creating branch');
    },
  });

  const deleteBranchMutation = useMutation<IrminAPIResponse, Error, string>({
    mutationFn: async (branch) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.branchService.deleteBranch({
        workspace: workspaceSlug,
        repository: repositorySlug,
        branch,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({
        queryKey: repositoryBranchesQueryKey(workspaceSlug, repositorySlug),
      });
      irminAlert('success', res.message ?? 'Branch deleted successfully');
    },
    onError: (error) => {
      console.error(error);
      irminAlert('error', error.message ?? 'Error deleting branch');
    },
  });

  return {
    // Queries
    repositoryBranchesQuery,

    // Mutations
    createBranchMutation,
    deleteBranchMutation,
  };
}
