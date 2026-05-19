import { useCallback, useMemo } from 'react';

import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';

import { connectionSchemaQueryKey } from '@/lib/queryKeys';

import { useIrminCore } from '@/context/IrminCoreContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { isTempId } from '@/utils/generateTempId';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { ObjectSchema } from '@/types/core/ObjectSchema';

export function useConnectionSchema(
  connectionID: string,
  operationMethod?: 'pull' | 'push',
  paths?: string[]
) {
  const { getCore } = useIrminCore();
  const { workspaceSlug } = useWorkspaceContext();

  // If no paths provided, fetch root schema (single query)
  const shouldUseSingleQuery = !paths || paths.length === 0;

  // Single query for root schema
  const singleQuery = useQuery<IrminAPIResponse<ObjectSchema>, Error>({
    queryKey: connectionSchemaQueryKey(
      workspaceSlug,
      connectionID,
      operationMethod,
      []
    ),
    queryFn: async () => {
      const core = await getCore();
      return await core.connectionService.fetchConnectionSchema({
        workspace: workspaceSlug,
        connectionID,
        operationMethod: operationMethod ?? 'pull',
        path: undefined,
      });
    },
    // Skip server fetch when the connection is an optimistic-create
    // placeholder — the schema endpoint would 404 on a non-SQID id.
    enabled: shouldUseSingleQuery && !!connectionID && !isTempId(connectionID),
  });

  // Multiple queries for specific paths - use combine to get stable output
  const multipleQueries = useQueries({
    queries: shouldUseSingleQuery
      ? []
      : paths.map((path) => ({
          queryKey: connectionSchemaQueryKey(
            workspaceSlug,
            connectionID,
            operationMethod,
            [path]
          ),
          queryFn: async () => {
            const core = await getCore();
            return await core.connectionService.fetchConnectionSchema({
              workspace: workspaceSlug,
              connectionID,
              operationMethod: operationMethod ?? 'pull',
              path,
            });
          },
          enabled: !!connectionID && !isTempId(connectionID),
        })),
    combine: (results) => ({
      data: results.map((result) => result.data?.data),
      isLoading: results.some((result) => result.isLoading),
      isError: results.some((result) => result.isError),
      error: results.find((result) => result.error)?.error,
      refetch: () => Promise.all(results.map((result) => result.refetch())),
    }),
  });

  // Combine results from multiple queries into a single schema
  const combinedSchema = useMemo(() => {
    if (shouldUseSingleQuery) {
      return singleQuery.data?.data;
    }

    const allSchemas = multipleQueries.data.filter(
      (schema): schema is ObjectSchema => schema !== undefined
    );

    if (allSchemas.length === 0) return undefined;
    if (allSchemas.length === 1) return allSchemas[0];

    // Merge multiple schemas into a single root schema
    // Create a root group that contains all the schemas as children
    return {
      name: '',
      path: '',
      type: 'group' as const,
      description: 'Combined connection schemas for the selected paths',
      children: allSchemas,
    };
  }, [shouldUseSingleQuery, singleQuery.data?.data, multipleQueries.data]);

  const isLoading = shouldUseSingleQuery
    ? singleQuery.isLoading
    : multipleQueries.isLoading;

  const isError = shouldUseSingleQuery
    ? singleQuery.isError
    : multipleQueries.isError;

  const error = shouldUseSingleQuery
    ? singleQuery.error
    : multipleQueries.error;

  const connectionSchemaQuery = {
    data: combinedSchema
      ? ({ data: combinedSchema } as IrminAPIResponse<ObjectSchema>)
      : undefined,
    isLoading,
    isError,
    error: error ?? null,
    refetch: shouldUseSingleQuery
      ? singleQuery.refetch
      : multipleQueries.refetch,
  };

  return {
    connectionSchemaQuery,
  };
}

/**
 * Hook returning an on-demand fetcher for a single connection-schema path.
 *
 * Used by tree pickers that lazy-load deeper levels as the user expands them.
 * Results are cached in React Query under the same key shape as
 * {@link useConnectionSchema}, so repeated expansions of the same node are
 * served from cache without a network round-trip.
 *
 * @param connectionID - The connection to query.
 * @param operationMethod - Whether this is a pull or push operation.
 * @returns An object exposing `fetchPath(path)` which resolves with the
 *   `ObjectSchema` for that path, or rejects on failure.
 */
export function useConnectionSchemaFetcher(
  connectionID: string,
  operationMethod?: 'pull' | 'push'
) {
  const { getCore } = useIrminCore();
  const { workspaceSlug } = useWorkspaceContext();
  const queryClient = useQueryClient();

  const fetchPath = useCallback(
    async (path: string): Promise<ObjectSchema> => {
      const result = await queryClient.fetchQuery<
        IrminAPIResponse<ObjectSchema>,
        Error
      >({
        queryKey: connectionSchemaQueryKey(
          workspaceSlug,
          connectionID,
          operationMethod,
          [path]
        ),
        queryFn: async () => {
          const core = await getCore();
          return await core.connectionService.fetchConnectionSchema({
            workspace: workspaceSlug,
            connectionID,
            operationMethod: operationMethod ?? 'pull',
            path,
          });
        },
        staleTime: 60_000,
      });
      if (!result.data) {
        throw new Error('Schema response missing data');
      }
      return result.data;
    },
    [queryClient, workspaceSlug, connectionID, operationMethod, getCore]
  );

  return { fetchPath };
}
