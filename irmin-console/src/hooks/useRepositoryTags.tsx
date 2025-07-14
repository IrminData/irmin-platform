import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import IrminCore from '@/lib/core';
import { repositoryTagsQueryKey } from '@/lib/queryKeys';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { GitTag } from '@/types/core/GitTag';
import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

export function useRepositoryTags(repositorySlug: string) {
  const { getToken } = useIAM();
  const { locale } = useLocale();
  const { irminAlert } = usePopup();
  const { workspaceSlug } = useWorkspaceContext();
  const queryClient = useQueryClient();

  const repositoryTagsQuery = useQuery<IrminAPIResponse<GitTag[]>, Error>({
    queryKey: repositoryTagsQueryKey(workspaceSlug, repositorySlug),
    queryFn: async () => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.repositoryTagService.fetchTags({
        workspace: workspaceSlug,
        repository: repositorySlug,
      });
    },
  });

  const createTagMutation = useMutation<
    IrminAPIResponse,
    Error,
    { name: string; ref: string }
  >({
    mutationFn: async (data) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.repositoryTagService.createTag({
        workspace: workspaceSlug,
        repository: repositorySlug,
        name: data.name,
        ref: data.ref,
      });
    },
    onSuccess: (res) => {
      void queryClient.invalidateQueries({
        queryKey: repositoryTagsQueryKey(workspaceSlug, repositorySlug),
      });
      irminAlert('success', res.message ?? 'Tag created successfully');
    },
    onError: (error) => {
      console.error(error);
      irminAlert('error', error.message ?? 'Error creating tag');
    },
  });

  const deleteTagMutation = useMutation<IrminAPIResponse, Error, string>({
    mutationFn: async (tag) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.repositoryTagService.deleteTag({
        workspace: workspaceSlug,
        repository: repositorySlug,
        tag,
      });
    },
    onSuccess: (res) => {
      void queryClient.invalidateQueries({
        queryKey: repositoryTagsQueryKey(workspaceSlug, repositorySlug),
      });
      irminAlert('success', res.message ?? 'Tag deleted successfully');
    },
    onError: (error) => {
      console.error(error);
      irminAlert('error', error.message ?? 'Error deleting tag');
    },
  });

  return {
    // Queries
    repositoryTagsQuery,

    // Mutations
    createTagMutation,
    deleteTagMutation,
  };
}
