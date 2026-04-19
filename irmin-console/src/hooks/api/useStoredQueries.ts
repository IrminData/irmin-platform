import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { storedQueriesQueryKey } from '@/lib/queryKeys';

import { useIrminCore } from '@/context/IrminCoreContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { StoredQuery } from '@/types/core/StoredQuery';

import {
  createMutationHandlers,
  deleteMutationHandlers,
  updateMutationHandlers,
} from './mutations/utils';

type StoredQueryCreateInput = Pick<
  StoredQuery,
  'description' | 'name' | 'sql'
> & {
  tags?: string[];
};

type StoredQueryUpdateInput = Pick<
  StoredQuery,
  'description' | 'id' | 'name' | 'sql'
>;

export function useStoredQueries() {
  const { getCore } = useIrminCore();
  const { irminAlert } = usePopup();
  const { dict } = useLocale();
  const { workspaceSlug } = useWorkspaceContext();
  const queryClient = useQueryClient();

  const storedQueriesQuery = useQuery({
    queryKey: storedQueriesQueryKey(workspaceSlug),
    queryFn: async () => {
      const core = await getCore();
      return await core.queryService.listStoredQueries({
        workspace: workspaceSlug,
      });
    },
  });

  const createStoredQueryMutation = useMutation({
    mutationFn: async (query: StoredQueryCreateInput) => {
      const core = await getCore();
      return await core.queryService.createStoredQuery({
        workspace: workspaceSlug,
        name: query.name,
        description: query.description,
        sql: query.sql,
        tags: query.tags,
      });
    },
    ...createMutationHandlers<StoredQuery, StoredQueryCreateInput>(
      queryClient,
      'stored-queries',
      {
        cacheConfig: {
          primaryQueryKey: storedQueriesQueryKey(workspaceSlug),
          getItemId: (query) => query.id,
          createOptimisticItem: (
            input: StoredQueryCreateInput,
            tempId: string
          ) => ({
            id: tempId,
            name: input.name,
            description: input.description,
            sql: input.sql,
            tags: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            owner: {
              id: 'temp-owner',
              first_name: 'Current',
              last_name: 'User',
              email: '',
              phone: '',
              company: '',
              language: '',
              profile_picture: '',
            },
          }),
        },
        onSuccess: (res) => {
          irminAlert('success', res.message ?? 'Query created successfully');
        },
        onError: (error) => {
          irminAlert(
            'error',
            error.message ?? dict.common.errors.mutations.createQueryFailed
          );
        },
      }
    ),
  });

  const updateStoredQueryMutation = useMutation({
    mutationFn: async (query: StoredQueryUpdateInput) => {
      const core = await getCore();
      return await core.queryService.updateStoredQuery({
        workspace: workspaceSlug,
        queryID: query.id,
        name: query.name,
        description: query.description,
        sql: query.sql,
      });
    },
    ...updateMutationHandlers<StoredQuery, StoredQueryUpdateInput>(
      queryClient,
      {
        cacheConfig: {
          primaryQueryKey: storedQueriesQueryKey(workspaceSlug),
          getItemId: (query) => query.id,
        },
        onSuccess: (res) => {
          irminAlert('success', res.message ?? 'Query updated successfully');
        },
        onError: (error) => {
          irminAlert(
            'error',
            error.message ?? dict.common.errors.mutations.updateQueryFailed
          );
        },
      }
    ),
  });

  const deleteStoredQueryMutation = useMutation({
    mutationFn: async (queryID: string) => {
      const core = await getCore();
      return await core.queryService.deleteStoredQuery({
        workspace: workspaceSlug,
        queryID,
      });
    },
    ...deleteMutationHandlers<StoredQuery>(queryClient, {
      cacheConfig: {
        primaryQueryKey: storedQueriesQueryKey(workspaceSlug),
        getItemId: (query) => query.id,
      },
      onSuccess: (res) => {
        irminAlert('success', res.message ?? 'Query deleted successfully');
      },
      onError: (error) => {
        irminAlert(
          'error',
          error.message ?? dict.common.errors.mutations.deleteQueryFailed
        );
      },
    }),
  });

  const transferStoredQueryMutation = useMutation({
    mutationFn: async ({
      queryID,
      newOwnerID,
    }: {
      queryID: string;
      newOwnerID: string;
    }) => {
      const core = await getCore();
      return await core.queryService.transferStoredQuery({
        workspace: workspaceSlug,
        queryID,
        newOwnerID,
      });
    },
    onSuccess: (res) => {
      void queryClient.invalidateQueries({
        queryKey: storedQueriesQueryKey(workspaceSlug),
      });
      irminAlert('success', res.message ?? 'Query transferred successfully');
    },
    onError: (error) => {
      console.error(error);
      irminAlert(
        'error',
        error.message ?? dict.common.errors.mutations.transferQueryFailed
      );
    },
  });

  const executeStoredQueryMutation = useMutation({
    mutationFn: async ({
      queryID,
      limitResponse,
    }: {
      queryID: string;
      limitResponse?: boolean;
    }) => {
      const core = await getCore();
      return await core.queryService.executeStoredQuery({
        workspace: workspaceSlug,
        queryID,
        limitResponse,
      });
    },
    onSuccess: (res) => {
      irminAlert('success', res.message ?? 'Query executed successfully');
    },
    onError: (error) => {
      console.error(error);
      irminAlert(
        'error',
        error.message ?? dict.common.errors.mutations.executeQueryFailed
      );
    },
  });

  return {
    // Queries
    storedQueriesQuery,
    queries: storedQueriesQuery.data?.data,

    // Mutations
    createStoredQueryMutation,
    updateStoredQueryMutation,
    deleteStoredQueryMutation,
    transferStoredQueryMutation,
    executeStoredQueryMutation,
  };
}
