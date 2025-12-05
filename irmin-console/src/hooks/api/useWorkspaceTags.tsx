import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import IrminCore from '@/lib/core';
import {
  connectionsQueryKey,
  repositoriesQueryKey,
  scriptsQueryKey,
  storedQueriesQueryKey,
  workspaceTagsQueryKey,
} from '@/lib/queryKeys';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { Tag, TagEntityType } from '@/types/core/Tag';

import {
  createMutationHandlers,
  deleteMutationHandlers,
  updateMutationHandlers,
} from './mutations/utils';

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

/**
 * Invalidates entity-related queries when tags are added or removed
 */
const invalidateEntityQueries = (
  queryClient: ReturnType<typeof useQueryClient>,
  workspaceSlug: string,
  entityType: TagEntityType
) => {
  // Always invalidate workspace tags query
  void queryClient.invalidateQueries({
    queryKey: workspaceTagsQueryKey(workspaceSlug),
  });

  // Invalidate entity-specific list queries
  switch (entityType) {
    case 'repositories':
      void queryClient.invalidateQueries({
        queryKey: repositoriesQueryKey(workspaceSlug),
      });
      break;
    case 'queries':
      void queryClient.invalidateQueries({
        queryKey: storedQueriesQueryKey(workspaceSlug),
      });
      break;
    case 'scripts':
      void queryClient.invalidateQueries({
        queryKey: scriptsQueryKey(workspaceSlug),
      });
      break;
    case 'workflows':
      void queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return (
            Array.isArray(key) &&
            key[0] === 'workflows' &&
            key[1] === workspaceSlug
          );
        },
      });
      break;
    case 'connections':
      void queryClient.invalidateQueries({
        queryKey: connectionsQueryKey(workspaceSlug),
      });
      break;
    case 'repository_objects':
      // Invalidate all repository object queries for this workspace
      // This is necessary because we don't have repository slug/ref/path from entityId
      void queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return (
            Array.isArray(key) &&
            (key[0] === 'repository-object' ||
              key[0] === 'repository-object-content' ||
              key[0] === 'repository-object-schema' ||
              key[0] === 'repository-object-history') &&
            key[1] === workspaceSlug
          );
        },
      });
      break;
  }

  // Invalidate workspace search queries as they include tags in results
  void queryClient.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey;
      return (
        Array.isArray(key) &&
        key[0] === 'workspace-search' &&
        key[1] === workspaceSlug
      );
    },
  });
};

export const useWorkspaceTags = (workspaceSlug: string) => {
  const { getToken } = useIAM();
  const { locale } = useLocale();
  const { irminAlert } = usePopup();
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
    ...createMutationHandlers<Tag, TagCreateRequest>(
      queryClient,
      'workspace-tags',
      {
        cacheConfig: {
          primaryQueryKey: workspaceTagsQueryKey(workspaceSlug),
          getItemId: (tag) => tag.id,
          createOptimisticItem: (input: TagCreateRequest, tempId: string) => ({
            id: tempId,
            name: input.name,
            color: input.color,
            description: input.description,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        },
        onSuccess: (res) => {
          irminAlert('success', res.message ?? 'Tag created successfully');
        },
        onError: (error) => {
          irminAlert('error', error.message ?? 'Failed to create tag');
        },
      }
    ),
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
    ...updateMutationHandlers<Tag, TagUpdateRequest>(queryClient, {
      cacheConfig: {
        primaryQueryKey: workspaceTagsQueryKey(workspaceSlug),
        getItemId: (tag) => tag.id,
      },
      onSuccess: (res) => {
        irminAlert('success', res.message ?? 'Tag updated successfully');
      },
      onError: (error) => {
        irminAlert('error', error.message ?? 'Failed to update tag');
      },
    }),
  });

  const deleteWorkspaceTagMutation = useMutation<
    IrminAPIResponse,
    Error,
    string
  >({
    mutationFn: async (tagId: string) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.tagService.deleteWorkspaceTag({
        workspace: workspaceSlug,
        tagId,
      });
    },
    ...deleteMutationHandlers<Tag>(queryClient, {
      cacheConfig: {
        primaryQueryKey: workspaceTagsQueryKey(workspaceSlug),
        getItemId: (tag) => tag.id,
      },
      onSuccess: (res) => {
        irminAlert('success', res.message ?? 'Tag deleted successfully');
      },
      onError: (error) => {
        irminAlert('error', error.message ?? 'Failed to delete tag');
      },
    }),
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
    onSuccess: (res, variables) => {
      invalidateEntityQueries(queryClient, workspaceSlug, variables.entityType);
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
    onSuccess: (res, variables) => {
      invalidateEntityQueries(queryClient, workspaceSlug, variables.entityType);
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
