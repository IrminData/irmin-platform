import { useMutation, useQuery } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';

import IrminCore from '@/lib/core';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { Tag, TagEntityType } from '@/types/core/Tag';

interface TagCreateRequest {
  name: string;
  color: string;
  description: string;
}

interface TagUpdateRequest {
  id: string;
  name: string;
  color: string;
  description: string;
}

interface TagDeleteRequest {
  id: string;
}

interface TagAddToEntityRequest {
  id: string;
  entityType: TagEntityType;
  entityId: string;
}

interface TagRemoveFromEntityRequest {
  id: string;
  entityType: TagEntityType;
  entityId: string;
}

export const workspaceTagsQueryKey = (workspaceSlug: string, tagID?: string) =>
  ['workspaceTags', workspaceSlug, tagID] as const;

export const useWorkspaceTags = () => {
  const { getToken } = useIAM();
  const { locale } = useLocale();
  const { irminAlert } = usePopup();
  const { workspaceSlug } = useWorkspaceContext();
  const queryClient = useQueryClient();

  const workspaceTagsQuery = useQuery<IrminAPIResponse<Tag[]>, Error>({
    queryKey: workspaceTagsQueryKey(workspaceSlug),
    queryFn: async () => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.tagService.listWorkspaceTags({
        workspace: workspaceSlug,
      });
    },
  });

  const createWorkspaceTagMutation = useMutation<
    IrminAPIResponse<Tag>,
    Error,
    TagCreateRequest
  >({
    mutationFn: async (data) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.tagService.createWorkspaceTag({
        workspace: workspaceSlug,
        name: data.name,
        color: data.color,
        description: data.description,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({
        queryKey: workspaceTagsQueryKey(workspaceSlug),
      });
      irminAlert('success', res.message ?? 'Tag created successfully');
    },
    onError: (error) => {
      irminAlert('error', error.message ?? 'Failed to create tag');
    },
  });

  const updateWorkspaceTagMutation = useMutation<
    IrminAPIResponse<Tag>,
    Error,
    TagUpdateRequest
  >({
    mutationFn: async (data) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.tagService.updateWorkspaceTag({
        workspace: workspaceSlug,
        tagId: data.id,
        name: data.name,
        color: data.color,
        description: data.description,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({
        queryKey: workspaceTagsQueryKey(workspaceSlug),
      });
      irminAlert('success', res.message ?? 'Tag updated successfully');
    },
    onError: (error) => {
      irminAlert('error', error.message ?? 'Failed to update tag');
    },
  });

  const deleteWorkspaceTagMutation = useMutation<
    IrminAPIResponse,
    Error,
    TagDeleteRequest
  >({
    mutationFn: async (data) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.tagService.deleteWorkspaceTag({
        workspace: workspaceSlug,
        tagId: data.id,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({
        queryKey: workspaceTagsQueryKey(workspaceSlug),
      });
      irminAlert('success', res.message ?? 'Tag deleted successfully');
    },
    onError: (error) => {
      irminAlert('error', error.message ?? 'Failed to delete tag');
    },
  });

  const addTagToEntityMutation = useMutation<
    IrminAPIResponse,
    Error,
    TagAddToEntityRequest
  >({
    mutationFn: async (data) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.tagService.addTagToEntity({
        workspace: workspaceSlug,
        tagId: data.id,
        entityType: data.entityType,
        entityId: data.entityId,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({
        queryKey: workspaceTagsQueryKey(workspaceSlug),
      });
      irminAlert('success', res.message ?? 'Tag added to entity successfully');
    },
    onError: (error) => {
      irminAlert('error', error.message ?? 'Failed to add tag to entity');
    },
  });

  const removeTagFromEntityMutation = useMutation<
    IrminAPIResponse,
    Error,
    TagRemoveFromEntityRequest
  >({
    mutationFn: async (data) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.tagService.removeTagFromEntity({
        workspace: workspaceSlug,
        tagId: data.id,
        entityType: data.entityType,
        entityId: data.entityId,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({
        queryKey: workspaceTagsQueryKey(workspaceSlug),
      });
      irminAlert(
        'success',
        res.message ?? 'Tag removed from entity successfully'
      );
    },
    onError: (error) => {
      irminAlert('error', error.message ?? 'Failed to remove tag from entity');
    },
  });

  return {
    // Queries
    workspaceTagsQuery,

    // Mutations
    createWorkspaceTagMutation,
    updateWorkspaceTagMutation,
    deleteWorkspaceTagMutation,
    addTagToEntityMutation,
    removeTagFromEntityMutation,
  };
};
