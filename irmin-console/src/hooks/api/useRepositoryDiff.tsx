import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  repositoryCommitsQueryKey,
  repositoryDiffQueryKey,
} from '@/lib/queryKeys';

import { useIrminCore } from '@/context/IrminCoreContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { Diff, MergeStrategy } from '@/types/core/Diff';
import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

export interface MergeRefsInput {
  base: string;
  compare: string;
  description: string;
  strategy: MergeStrategy;
  squash: boolean;
}

export function useRepositoryDiff(
  repositorySlug: string,
  base?: string,
  compare?: string
) {
  const { getCore } = useIrminCore();
  const { irminAlert } = usePopup();
  const { dict } = useLocale();
  const { workspaceSlug } = useWorkspaceContext();
  const queryClient = useQueryClient();

  const diffQuery = useQuery<IrminAPIResponse<Diff>, Error>({
    queryKey: repositoryDiffQueryKey(
      workspaceSlug,
      repositorySlug,
      base ?? '',
      compare ?? ''
    ),
    queryFn: async () => {
      const core = await getCore();
      return await core.diffService.compareRefs({
        workspace: workspaceSlug,
        repository: repositorySlug,
        baseRef: base ?? '',
        compareRef: compare ?? '',
      });
    },
    enabled: !!base && !!compare,
  });

  const mergeRefsMutation = useMutation<
    IrminAPIResponse,
    Error,
    MergeRefsInput
  >({
    mutationFn: async (data) => {
      const core = await getCore();
      return await core.diffService.mergeRefs({
        workspace: workspaceSlug,
        repository: repositorySlug,
        baseRef: data.base,
        compareRef: data.compare,
        description: data.description,
        mergeStrategy: data.strategy,
        squash: data.squash,
        allowEmpty: true,
      });
    },
    onSuccess: (res) => {
      // Invalidate diff and commits for both base and compare refs
      void queryClient.invalidateQueries({
        queryKey: repositoryDiffQueryKey(
          workspaceSlug,
          repositorySlug,
          base ?? '',
          compare ?? ''
        ),
      });
      void queryClient.invalidateQueries({
        queryKey: repositoryCommitsQueryKey(
          workspaceSlug,
          repositorySlug,
          base ?? '',
          ''
        ),
      });
      void queryClient.invalidateQueries({
        queryKey: repositoryCommitsQueryKey(
          workspaceSlug,
          repositorySlug,
          compare ?? '',
          ''
        ),
      });
      irminAlert('success', res.message ?? 'Successfully merged');
    },
    onError: (error) => {
      irminAlert(
        'error',
        error.message ?? dict.common.errors.mutations.mergeRefsFailed
      );
    },
  });

  return {
    // Queries
    diffQuery,

    // Mutations
    mergeRefsMutation,
  };
}
