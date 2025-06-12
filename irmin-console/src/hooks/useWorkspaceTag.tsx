import { useQuery } from '@tanstack/react-query';

import IrminCore from '@/lib/core';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { workspaceTagsQueryKey } from '@/hooks/useWorkspaceTags';

import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { TagWithAssets } from '@/types/core/Tag';

export function useWorkspaceTag(tagID?: string) {
  const { getToken } = useIAM();
  const { locale } = useLocale();
  const { workspaceSlug } = useWorkspaceContext();

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
    enabled: !!tagID,
  });

  return {
    // Queries
    workspaceTagQuery,
  };
}
