import { useQuery, useQueryClient } from '@tanstack/react-query';

import IrminCore from '@/lib/core';
import { workspaceTagsQueryKey } from '@/lib/queryKeys';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { TagWithAssets } from '@/types/core/Tag';

export function useWorkspaceTag(tagID?: string) {
  const { getToken } = useIAM();
  const { locale } = useLocale();
  const { workspaceSlug } = useWorkspaceContext();
  const queryClient = useQueryClient();

  const workspaceTagQuery = useQuery<IrminAPIResponse<TagWithAssets>, Error>({
    queryKey: workspaceTagsQueryKey(workspaceSlug, tagID),
    queryFn: async () => {
      if (!tagID) throw new Error('Tag ID is required');
      if (!workspaceSlug) throw new Error('Workspace slug is required');

      const token = await getToken();
      const core = new IrminCore(locale, token);
      const tag = await core.tagService.getWorkspaceTag({
        workspace: workspaceSlug,
        tagId: tagID,
      });
      return tag;
    },
    initialData: () => {
      const workspaceTags = queryClient.getQueryData<
        IrminAPIResponse<TagWithAssets[]>
      >(workspaceTagsQueryKey(workspaceSlug));
      return workspaceTags?.data?.find((t: TagWithAssets) => t.tag.id === tagID)
        ? {
            data: workspaceTags.data.find(
              (t: TagWithAssets) => t.tag.id === tagID
            ),
            success: true,
            message: 'Cached data',
          }
        : undefined;
    },
    enabled: !!tagID,
  });

  return {
    // Queries
    workspaceTagQuery,
  };
}
