import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import IrminCore from '@/lib/core';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { StoredQuery } from '@/types/core/StoredQuery';

export type StoredQueryCreateInput = Pick<
  StoredQuery,
  'name' | 'description' | 'sql'
>;

export type StoredQueryUpdateInput = Pick<
  StoredQuery,
  'id' | 'name' | 'description' | 'sql'
>;

export function useStoredQueries() {
  const { getToken } = useIAM();
  const { locale } = useLocale();
  const { irminAlert } = usePopup();
  const { workspaceSlug } = useWorkspaceContext();
  const queryClient = useQueryClient();

  const storedQueriesQuery = useQuery({
    queryKey: ['stored-queries', workspaceSlug],
    queryFn: async () => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.queryService.listStoredQueries({
        workspace: workspaceSlug,
      });
    },
  });

  const createStoredQueryMutation = useMutation({
    mutationFn: async (query: StoredQueryCreateInput) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.queryService.createStoredQuery({
        workspace: workspaceSlug,
        name: query.name,
        description: query.description,
        sql: query.sql,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({
        queryKey: ['stored-queries', workspaceSlug],
      });
      irminAlert('success', res.message ?? 'Query created successfully');
    },
    onError: (error) => {
      console.error(error);
      irminAlert('error', error.message ?? 'Failed to create query');
    },
  });

  const updateStoredQueryMutation = useMutation({
    mutationFn: async (query: StoredQueryUpdateInput) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.queryService.updateStoredQuery({
        workspace: workspaceSlug,
        queryID: query.id,
        name: query.name,
        description: query.description,
        sql: query.sql,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({
        queryKey: ['stored-queries', workspaceSlug],
      });
      irminAlert('success', res.message ?? 'Query updated successfully');
    },
    onError: (error) => {
      console.error(error);
      irminAlert('error', error.message ?? 'Failed to update query');
    },
  });

  const deleteStoredQueryMutation = useMutation({
    mutationFn: async (queryID: string) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.queryService.deleteStoredQuery({
        workspace: workspaceSlug,
        queryID,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({
        queryKey: ['stored-queries', workspaceSlug],
      });
      irminAlert('success', res.message ?? 'Query deleted successfully');
    },
    onError: (error) => {
      console.error(error);
      irminAlert('error', error.message ?? 'Failed to delete query');
    },
  });

  const transferStoredQueryMutation = useMutation({
    mutationFn: async ({
      queryID,
      newOwnerID,
    }: {
      queryID: string;
      newOwnerID: string;
    }) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.queryService.transferStoredQuery({
        workspace: workspaceSlug,
        queryID,
        newOwnerID,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({
        queryKey: ['stored-queries', workspaceSlug],
      });
      irminAlert('success', res.message ?? 'Query transferred successfully');
    },
    onError: (error) => {
      console.error(error);
      irminAlert('error', error.message ?? 'Failed to transfer query');
    },
  });

  const executeStoredQueryMutation = useMutation({
    mutationFn: async (queryID: string) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.queryService.executeStoredQuery({
        workspace: workspaceSlug,
        queryID,
      });
    },
    onSuccess: (res) => {
      irminAlert('success', res.message ?? 'Query executed successfully');
    },
    onError: (error) => {
      console.error(error);
      irminAlert('error', error.message ?? 'Failed to execute query');
    },
  });

  return {
    // Queries
    storedQueriesQuery,

    // Mutations
    createStoredQueryMutation,
    updateStoredQueryMutation,
    deleteStoredQueryMutation,
    transferStoredQueryMutation,
    executeStoredQueryMutation,
  };
}
