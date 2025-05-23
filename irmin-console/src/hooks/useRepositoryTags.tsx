import { useMutation, useQuery } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';

import IrminCore from '@/lib/core';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { Tag } from '@/types/core/Tag';

export const repositoryTagsQueryKey = (
  workspaceSlug: string,
  repositorySlug: string
) => ['repositoryTags', workspaceSlug, repositorySlug] as const;

export function useRepositoryTags(repositorySlug: string) {
  const { getToken } = useIAM();
  const { locale } = useLocale();
  const { irminAlert } = usePopup();
  const { workspaceSlug } = useWorkspaceContext();
  const queryClient = useQueryClient();

  const repositoryTagsQuery = useQuery<IrminAPIResponse<Tag[]>, Error>({
    queryKey: repositoryTagsQueryKey(workspaceSlug, repositorySlug),
    queryFn: async () => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.tagService.fetchTags({
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
      return await core.tagService.createTag({
        workspace: workspaceSlug,
        repository: repositorySlug,
        name: data.name,
        ref: data.ref,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({
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
      return await core.tagService.deleteTag({
        workspace: workspaceSlug,
        repository: repositorySlug,
        tag,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({
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
