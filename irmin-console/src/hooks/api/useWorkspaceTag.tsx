import { useQuery } from '@tanstack/react-query';

import { workspaceTagsQueryKey } from '@/lib/queryKeys';

import { useIrminCore } from '@/context/IrminCoreContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { TagWithAssets } from '@/types/core/Tag';

export function useWorkspaceTag(tagID?: string) {
  const { getCore } = useIrminCore();
  const { workspaceSlug } = useWorkspaceContext();

  const workspaceTagQuery = useQuery<IrminAPIResponse<TagWithAssets>, Error>({
    queryKey: workspaceTagsQueryKey(workspaceSlug, tagID),
    queryFn: async () => {
      if (!tagID) throw new Error('Tag ID is required');
      if (!workspaceSlug) throw new Error('Workspace slug is required');

      const core = await getCore();
      const tag = await core.tagService.getWorkspaceTag({
        workspace: workspaceSlug,
        tagId: tagID,
      });
      return tag;
    },
    enabled: !!tagID,
  });

  return {
    // Queries
    workspaceTagQuery,
  };
}
