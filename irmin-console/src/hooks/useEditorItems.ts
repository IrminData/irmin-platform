import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import IrminCore from '@/lib/core';
import { editorItemQueryKey, editorItemsQueryKey } from '@/lib/queryKeys';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { EditorItem } from '@/types/core/EditorItems';
import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { ActionInputData } from '@/types/core/Workflow';

export function useEditorItems(path?: string) {
  const { getToken } = useIAM();
  const { locale } = useLocale();
  const { irminAlert } = usePopup();
  const { workspaceSlug } = useWorkspaceContext();
  const queryClient = useQueryClient();

  const editorItemsQuery = useQuery({
    queryKey: editorItemsQueryKey(workspaceSlug),
    queryFn: async () => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.editorItemService.listEditorItems({
        workspace: workspaceSlug,
        path: '',
      });
    },
  });

  const editorItemQuery = useQuery({
    queryKey: editorItemQueryKey(workspaceSlug, path ?? ''),
    queryFn: async () => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.editorItemService.getEditorItemContent({
        workspace: workspaceSlug,
        path: path ?? '',
      });
    },
    enabled: !!path,
  });

  const moveEditorItemMutation = useMutation({
    mutationFn: async (item: { path: string; destinationPath: string }) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.editorItemService.moveEditorItem({
        workspace: workspaceSlug,
        path: item.path,
        destinationPath: item.destinationPath,
      });
    },
    onSuccess: (res, item) => {
      void queryClient.invalidateQueries({
        queryKey: editorItemsQueryKey(workspaceSlug),
      });
      void queryClient.invalidateQueries({
        queryKey: editorItemQueryKey(workspaceSlug, item.path),
      });
      irminAlert('success', res.message ?? 'Editor item moved successfully.');
    },
    onError: (error) => {
      irminAlert('error', error.message ?? 'Failed to move editor item.');
    },
  });

  const copyEditorItemMutation = useMutation({
    mutationFn: async (item: { path: string; destinationPath: string }) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.editorItemService.copyEditorItem({
        workspace: workspaceSlug,
        path: item.path,
        destinationPath: item.destinationPath,
      });
    },
    onSuccess: (res) => {
      void queryClient.invalidateQueries({
        queryKey: editorItemsQueryKey(workspaceSlug),
      });
      irminAlert('success', res.message ?? 'Editor item copied successfully.');
    },
    onError: (error) => {
      irminAlert('error', error.message ?? 'Failed to copy editor item.');
    },
  });

  const deleteEditorItemMutation = useMutation({
    mutationFn: async (item: { path: string }) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.editorItemService.deleteEditorItem({
        workspace: workspaceSlug,
        path: item.path,
      });
    },
    onMutate: async (item: { path: string }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: editorItemsQueryKey(workspaceSlug),
      });
      await queryClient.cancelQueries({
        queryKey: editorItemQueryKey(workspaceSlug, item.path),
      });

      // Snapshot the previous values
      const previousEditorItems = queryClient.getQueryData(
        editorItemsQueryKey(workspaceSlug)
      );
      const previousEditorItem = queryClient.getQueryData(
        editorItemQueryKey(workspaceSlug, item.path)
      );

      // Optimistically remove the item from the editor items cache
      queryClient.setQueryData(
        editorItemsQueryKey(workspaceSlug),
        (old: IrminAPIResponse<EditorItem[]> | undefined) => {
          if (!old?.data) return old;

          // Filter out the deleted item - need to handle nested structure
          const filterItems = (items: EditorItem[]): EditorItem[] => {
            return items
              .filter((editorItem: EditorItem) => {
                if (editorItem.path === item.path) {
                  return false; // Remove this item
                }
                return true;
              })
              .map((editorItem: EditorItem) => {
                // Create new object with filtered children to maintain immutability
                if (editorItem.children) {
                  return {
                    ...editorItem,
                    children: filterItems(editorItem.children),
                  };
                }
                return editorItem;
              });
          };

          return {
            ...old,
            data: filterItems(old.data),
          };
        }
      );

      // Clear single editor item cache
      queryClient.removeQueries({
        queryKey: editorItemQueryKey(workspaceSlug, item.path),
      });

      // Return context for rollback
      return {
        previousEditorItems: previousEditorItems as
          | IrminAPIResponse<EditorItem[]>
          | undefined,
        previousEditorItem,
      };
    },
    onError: (
      error,
      item: { path: string },
      context?: {
        previousEditorItems?: IrminAPIResponse<EditorItem[]>;
        previousEditorItem?: unknown;
      }
    ) => {
      // Rollback on error
      if (context?.previousEditorItems) {
        queryClient.setQueryData(
          editorItemsQueryKey(workspaceSlug),
          context.previousEditorItems
        );
      }
      if (context?.previousEditorItem) {
        queryClient.setQueryData(
          editorItemQueryKey(workspaceSlug, item.path),
          context.previousEditorItem
        );
      }
      irminAlert('error', error.message ?? 'Failed to delete editor item.');
    },
    onSuccess: (res: IrminAPIResponse, _item: { path: string }) => {
      // The optimistic update is already done, just show success message
      irminAlert('success', res.message ?? 'Editor item deleted successfully.');
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      void queryClient.invalidateQueries({
        queryKey: editorItemsQueryKey(workspaceSlug),
      });
    },
  });

  const saveEditorItemMutation = useMutation({
    mutationFn: async (item: { path: string; content: string }) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.editorItemService.saveEditorItem({
        workspace: workspaceSlug,
        path: item.path,
        content: item.content,
      });
    },
    onSuccess: (res, item) => {
      void queryClient.invalidateQueries({
        queryKey: editorItemsQueryKey(workspaceSlug),
      });
      void queryClient.invalidateQueries({
        queryKey: editorItemQueryKey(workspaceSlug, item.path),
      });
      irminAlert('success', res.message ?? 'Editor item saved successfully.');
    },
    onError: (error) => {
      irminAlert('error', error.message ?? 'Failed to save editor item.');
    },
  });

  const createEditorFolderMutation = useMutation({
    mutationFn: async (item: { path: string }) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.editorItemService.createEditorFolder({
        workspace: workspaceSlug,
        path: item.path,
      });
    },
    onMutate: async (item: { path: string }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: editorItemsQueryKey(workspaceSlug),
      });

      // Snapshot the previous value
      const previousEditorItems = queryClient.getQueryData(
        editorItemsQueryKey(workspaceSlug)
      );

      // Optimistically add the new folder to the editor items cache
      queryClient.setQueryData(
        editorItemsQueryKey(workspaceSlug),
        (old: IrminAPIResponse<EditorItem[]> | undefined) => {
          if (!old?.data) return old;

          // Create optimistic folder object
          const optimisticFolder: EditorItem = {
            name: item.path.split('/').pop() || 'New Folder',
            path: item.path,
            type: 'folder' as const,
            children: [],
            last_modified: new Date().toISOString(),
          };

          // Add the new folder to the appropriate location in the tree
          const addToTree = (
            items: EditorItem[],
            targetPath: string
          ): EditorItem[] => {
            const pathParts = targetPath.split('/');
            const parentPath = pathParts.slice(0, -1).join('/');

            if (parentPath === '' || parentPath === '.') {
              // Add to root level
              return [...items, optimisticFolder];
            }

            // Find parent folder and add to its children
            return items.map((editorItem: EditorItem) => {
              if (
                editorItem.path === parentPath &&
                editorItem.type === 'folder'
              ) {
                return {
                  ...editorItem,
                  children: [...(editorItem.children || []), optimisticFolder],
                };
              }
              if (editorItem.children) {
                return {
                  ...editorItem,
                  children: addToTree(editorItem.children, targetPath),
                };
              }
              return editorItem;
            });
          };

          return {
            ...old,
            data: addToTree(old.data, item.path),
          };
        }
      );

      // Return context for rollback
      return {
        previousEditorItems: previousEditorItems as
          | IrminAPIResponse<EditorItem[]>
          | undefined,
      };
    },
    onError: (
      error,
      item: { path: string },
      context?: { previousEditorItems?: IrminAPIResponse<EditorItem[]> }
    ) => {
      // Rollback on error
      if (context?.previousEditorItems) {
        queryClient.setQueryData(
          editorItemsQueryKey(workspaceSlug),
          context.previousEditorItems
        );
      }
      irminAlert('error', error.message ?? 'Failed to create editor folder.');
    },
    onSuccess: (res: IrminAPIResponse, item: { path: string }) => {
      // Update with real data from server if available
      if (res.data) {
        // Update the optimistic folder with real data
        queryClient.setQueryData(
          editorItemsQueryKey(workspaceSlug),
          (old: IrminAPIResponse<EditorItem[]> | undefined) => {
            if (!old?.data) return old;

            const updateFolder = (items: EditorItem[]): EditorItem[] => {
              return items.map((editorItem: EditorItem) => {
                if (
                  editorItem.path === item.path &&
                  editorItem.type === 'folder'
                ) {
                  return res.data as EditorItem; // Replace with real data
                }
                if (editorItem.children) {
                  return {
                    ...editorItem,
                    children: updateFolder(editorItem.children),
                  };
                }
                return editorItem;
              });
            };

            return {
              ...old,
              data: updateFolder(old.data),
            };
          }
        );
      }

      irminAlert(
        'success',
        res.message ?? 'Editor folder created successfully.'
      );
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      void queryClient.invalidateQueries({
        queryKey: editorItemsQueryKey(workspaceSlug),
      });
    },
  });

  const runScriptMutation = useMutation({
    mutationFn: async (item: { path: string; inputs: ActionInputData[] }) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.editorItemService.runScript({
        workspace: workspaceSlug,
        path: item.path,
        inputs: item.inputs,
      });
    },
    onSuccess: (res) => {
      irminAlert('info', res.message ?? 'Script run completed.');
    },
    onError: (error) => {
      irminAlert('error', error.message ?? 'Failed to run script.');
    },
  });

  return {
    // Queries
    editorItemsQuery,
    editorItemQuery,

    // Mutations
    moveEditorItemMutation,
    copyEditorItemMutation,
    deleteEditorItemMutation,
    saveEditorItemMutation,
    createEditorFolderMutation,
    runScriptMutation,
  };
}
