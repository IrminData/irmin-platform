import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import IrminCore from '@/lib/core';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { ActionInputData } from '@/types/core/Workflow';

export const editorItemsQueryKey = (workspaceSlug: string) =>
  ['editorItems', workspaceSlug] as const;

export const editorItemQueryKey = (workspaceSlug: string, path: string) =>
  ['editorItem', workspaceSlug, path] as const;

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
      queryClient.invalidateQueries({
        queryKey: editorItemsQueryKey(workspaceSlug),
      });
      queryClient.invalidateQueries({
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
      queryClient.invalidateQueries({
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
    onSuccess: (res, item) => {
      queryClient.invalidateQueries({
        queryKey: editorItemsQueryKey(workspaceSlug),
      });
      queryClient.invalidateQueries({
        queryKey: editorItemQueryKey(workspaceSlug, item.path),
      });
      irminAlert('success', res.message ?? 'Editor item deleted successfully.');
    },
    onError: (error) => {
      irminAlert('error', error.message ?? 'Failed to delete editor item.');
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
      queryClient.invalidateQueries({
        queryKey: editorItemsQueryKey(workspaceSlug),
      });
      queryClient.invalidateQueries({
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
    onSuccess: (res) => {
      queryClient.invalidateQueries({
        queryKey: editorItemsQueryKey(workspaceSlug),
      });
      irminAlert(
        'success',
        res.message ?? 'Editor folder created successfully.'
      );
    },
    onError: (error) => {
      irminAlert('error', error.message ?? 'Failed to create editor folder.');
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
