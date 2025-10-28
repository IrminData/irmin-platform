import { useMemo } from 'react';

import { useQueries, useQuery } from '@tanstack/react-query';

import IrminCore from '@/lib/core';
import { connectionSchemaQueryKey } from '@/lib/queryKeys';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { ObjectSchema } from '@/types/core/ObjectSchema';

export function useConnectionSchema(
  connectionID: string,
  operationMethod?: 'pull' | 'push',
  paths?: string[]
) {
  const { getToken } = useIAM();
  const { locale } = useLocale();
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
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.connectionService.fetchConnectionSchema({
        workspace: workspaceSlug,
        connectionID,
        operationMethod: operationMethod ?? 'pull',
        path: undefined,
      });
    },
    enabled: shouldUseSingleQuery && !!connectionID,
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
            const token = await getToken();
            const core = new IrminCore(locale, token);
            return await core.connectionService.fetchConnectionSchema({
              workspace: workspaceSlug,
              connectionID,
              operationMethod: operationMethod ?? 'pull',
              path,
            });
          },
          enabled: !!connectionID,
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
