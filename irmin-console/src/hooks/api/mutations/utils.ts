import { QueryClient } from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';

import { generateTempId } from '@/utils/generateTempId';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

import type {
  CreateMutationOptions,
  DeleteMutationOptions,
  MutationCacheConfig,
  MutationContext,
  UpdateMutationOptions,
} from './types';

/**
 * Helper to extract ID from input using config's getInputId or fallback logic.
 * Fallback hierarchy: custom getInputId → 'id' property → common ID fields → slug fields → fields ending with 'Id'
 */
function getInputIdFromConfig<TData, TInput>(
  config: MutationCacheConfig<TData, TInput>,
  input: TInput & { id?: string }
): string {
  // Use custom getInputId if provided
  if (config.getInputId) {
    return config.getInputId(input);
  }

  // Fallback 1: Check for direct 'id' property
  if (input.id) {
    return input.id;
  }

  // Fallback 2: Look for common exact ID field names
  const inputRecord = input as Record<string, unknown>;
  const commonIdFields = ['id', '_id', 'ID', 'Id'];

  for (const field of commonIdFields) {
    if (inputRecord[field] && typeof inputRecord[field] === 'string') {
      return inputRecord[field] as string;
    }
  }

  // Fallback 3: Look for slug fields (common unique identifiers)
  const commonSlugFields = ['slug', 'Slug', 'SLUG'];

  for (const field of commonSlugFields) {
    if (inputRecord[field] && typeof inputRecord[field] === 'string') {
      return inputRecord[field] as string;
    }
  }

  // Fallback 4: Look for fields ending with 'Id' (more specific than containing 'id')
  const idField = Object.keys(inputRecord).find(
    (key) => key.endsWith('Id') && typeof inputRecord[key] === 'string'
  );

  if (idField && inputRecord[idField]) {
    return inputRecord[idField] as string;
  }

  // Final fallback: empty string (will not match any item)
  console.warn('Could not determine ID from input:', input);
  return '';
}

/**
 * Shared helper: Cancel queries and snapshot data
 */
async function setupMutationContext<TData, TInput = unknown>(
  queryClient: QueryClient,
  config: MutationCacheConfig<TData, TInput>,
  singleItemQueryKey?: QueryKey
): Promise<Omit<MutationContext<TData>, 'tempId'>> {
  // Cancel any outgoing refetches
  await queryClient.cancelQueries({ queryKey: config.primaryQueryKey });

  if (singleItemQueryKey) {
    await queryClient.cancelQueries({ queryKey: singleItemQueryKey });
  }

  // Cancel related queries
  if (config.relatedQueryKeys) {
    for (const queryKey of config.relatedQueryKeys) {
      await queryClient.cancelQueries({ queryKey });
    }
  }

  // Snapshot the previous values
  const previousData = queryClient.getQueryData<IrminAPIResponse<TData[]>>(
    config.primaryQueryKey
  );

  const previousSingleData = singleItemQueryKey
    ? queryClient.getQueryData<IrminAPIResponse<TData>>(singleItemQueryKey)
    : undefined;

  // Snapshot related query data
  const relatedPreviousData = new Map<string, unknown>();
  if (config.relatedQueryKeys) {
    for (const queryKey of config.relatedQueryKeys) {
      const data = queryClient.getQueryData(queryKey);
      relatedPreviousData.set(JSON.stringify(queryKey), data);
    }
  }

  return { previousData, previousSingleData, relatedPreviousData };
}

/**
 * Shared helper: Rollback optimistic updates on error
 */
function rollbackOptimisticUpdates<TData, TInput = unknown>(
  queryClient: QueryClient,
  config: MutationCacheConfig<TData, TInput>,
  context: MutationContext<TData>,
  singleItemQueryKey?: QueryKey
) {
  // Rollback list cache
  if (context.previousData) {
    queryClient.setQueryData(config.primaryQueryKey, context.previousData);
  }

  // Rollback single item cache
  if (context.previousSingleData && singleItemQueryKey) {
    queryClient.setQueryData(singleItemQueryKey, context.previousSingleData);
  }

  // Rollback related queries
  if (context.relatedPreviousData && config.relatedQueryKeys) {
    for (const queryKey of config.relatedQueryKeys) {
      const data = context.relatedPreviousData.get(JSON.stringify(queryKey));
      if (data !== undefined) {
        queryClient.setQueryData(queryKey, data);
      }
    }
  }
}

/**
 * Generic onMutate handler for create mutations
 */
function createOnMutate<TData, TInput>(
  queryClient: QueryClient,
  config: MutationCacheConfig<TData, TInput>,
  entityType: string
) {
  return async (input: TInput): Promise<MutationContext<TData>> => {
    const context = await setupMutationContext(queryClient, config);

    // Generate temp ID and create optimistic item
    const tempId = generateTempId(entityType);

    if (config.createOptimisticItem) {
      const optimisticItem = config.createOptimisticItem(input, tempId);

      // Optimistically update the cache
      queryClient.setQueryData<IrminAPIResponse<TData[]>>(
        config.primaryQueryKey,
        (old: IrminAPIResponse<TData[]> | undefined) => {
          if (!old?.data) return old;

          return {
            ...old,
            data: [...old.data, optimisticItem],
          };
        }
      );
    }

    return { ...context, tempId };
  };
}

/**
 * Generic onMutate handler for update mutations
 */
function updateOnMutate<TData, TInput>(
  queryClient: QueryClient,
  config: MutationCacheConfig<TData, TInput>,
  singleItemQueryKey?: QueryKey
) {
  return async (
    input: TInput & { id?: string }
  ): Promise<MutationContext<TData>> => {
    const context = await setupMutationContext(
      queryClient,
      config,
      singleItemQueryKey
    );

    // Optimistically update the list cache
    queryClient.setQueryData<IrminAPIResponse<TData[]>>(
      config.primaryQueryKey,
      (old: IrminAPIResponse<TData[]> | undefined) => {
        if (!old?.data) return old;

        const updatedItems = old.data.map((item: TData) => {
          const itemId = config.getItemId(item);
          const inputId = getInputIdFromConfig(config, input);
          return itemId === inputId ? { ...item, ...input } : item;
        });

        return {
          ...old,
          data: updatedItems,
        };
      }
    );

    // Optimistically update single item cache if it exists
    if (singleItemQueryKey) {
      queryClient.setQueryData<IrminAPIResponse<TData>>(
        singleItemQueryKey,
        (old: IrminAPIResponse<TData> | undefined) => {
          if (!old?.data) return old;

          return {
            ...old,
            data: {
              ...old.data,
              ...input,
            },
          };
        }
      );
    }

    return context;
  };
}

/**
 * Generic onMutate handler for delete mutations
 */
function deleteOnMutate<TData>(
  queryClient: QueryClient,
  config: MutationCacheConfig<TData>,
  singleItemQueryKey?: QueryKey
) {
  return async (itemId: string): Promise<MutationContext<TData>> => {
    const context = await setupMutationContext(
      queryClient,
      config,
      singleItemQueryKey
    );

    // Optimistically remove from list cache
    queryClient.setQueryData<IrminAPIResponse<TData[]>>(
      config.primaryQueryKey,
      (old: IrminAPIResponse<TData[]> | undefined) => {
        if (!old?.data) return old;

        const filteredItems = old.data.filter(
          (item: TData) => config.getItemId(item) !== itemId
        );

        return {
          ...old,
          data: filteredItems,
        };
      }
    );

    // Clear single item cache
    if (singleItemQueryKey) {
      queryClient.removeQueries({ queryKey: singleItemQueryKey });
    }

    return context;
  };
}

/**
 * Generic onError handler that rolls back optimistic updates
 */
function rollbackOnError<TData, TInput = unknown>(
  queryClient: QueryClient,
  config: MutationCacheConfig<TData, TInput>,
  singleItemQueryKey?: QueryKey
) {
  return (error: Error, _variables: unknown, context: unknown) => {
    const ctx = context as MutationContext<TData> | undefined;
    if (ctx) {
      rollbackOptimisticUpdates(queryClient, config, ctx, singleItemQueryKey);
    }
    console.error('Mutation error:', error);
  };
}

/**
 * Generic onSuccess handler for create mutations
 */
function createOnSuccess<TData, TInput>(
  queryClient: QueryClient,
  config: MutationCacheConfig<TData, TInput>,
  customHandler?: (data: IrminAPIResponse<TData>, input: TInput) => void
) {
  return (
    response: IrminAPIResponse<TData>,
    input: TInput,
    context: unknown
  ) => {
    const ctx = context as MutationContext<TData> | undefined;

    // Update cache with real data from server if available
    if (response.data && ctx?.tempId) {
      queryClient.setQueryData<IrminAPIResponse<TData[]>>(
        config.primaryQueryKey,
        (old: IrminAPIResponse<TData[]> | undefined) => {
          if (!old?.data) return old;

          // Replace the optimistic item with the real one
          const updatedItems = old.data.map((item: TData) =>
            config.getItemId(item) === ctx.tempId ? response.data! : item
          );

          return {
            ...old,
            data: updatedItems,
          };
        }
      );
    } else {
      // Fallback: invalidate if we couldn't update with real data
      queryClient.invalidateQueries({ queryKey: config.primaryQueryKey });
    }

    customHandler?.(response, input);
  };
}

/**
 * Generic onSuccess handler for update mutations
 */
function updateOnSuccess<TData, TInput>(
  queryClient: QueryClient,
  config: MutationCacheConfig<TData, TInput>,
  singleItemQueryKey?: QueryKey,
  customHandler?: (data: IrminAPIResponse<TData>, input: TInput) => void
) {
  return (
    response: IrminAPIResponse<TData>,
    input: TInput,
    _context: unknown
  ) => {
    // Update cache with real data from server if available
    if (response.data) {
      const itemId = config.getItemId(response.data);

      // Update list cache
      queryClient.setQueryData<IrminAPIResponse<TData[]>>(
        config.primaryQueryKey,
        (old: IrminAPIResponse<TData[]> | undefined) => {
          if (!old?.data) return old;

          const updatedItems = old.data.map((item: TData) =>
            config.getItemId(item) === itemId ? response.data! : item
          );

          return {
            ...old,
            data: updatedItems,
          };
        }
      );

      // Update single item cache
      if (singleItemQueryKey) {
        queryClient.setQueryData(singleItemQueryKey, response);
      }
    } else {
      // Fallback: invalidate if we couldn't update with real data
      queryClient.invalidateQueries({ queryKey: config.primaryQueryKey });
      if (singleItemQueryKey) {
        queryClient.invalidateQueries({ queryKey: singleItemQueryKey });
      }
    }

    customHandler?.(response, input);
  };
}

/**
 * Generic onSuccess handler for delete mutations
 */
function deleteOnSuccess<TData>(
  queryClient: QueryClient,
  config: MutationCacheConfig<TData>,
  customHandler?: (data: IrminAPIResponse, itemId: string) => void
) {
  return (response: IrminAPIResponse, itemId: string, _context: unknown) => {
    // The optimistic update is already done, just handle any custom logic
    customHandler?.(response, itemId);
  };
}

/**
 * Create a complete set of mutation handlers for create operations
 */
export function createMutationHandlers<TData, TInput>(
  queryClient: QueryClient,
  entityType: string,
  options: CreateMutationOptions<TData, TInput>
) {
  return {
    onMutate: createOnMutate<TData, TInput>(
      queryClient,
      options.cacheConfig,
      entityType
    ),
    onError: (error: Error, input: TInput, context: unknown) => {
      rollbackOnError(queryClient, options.cacheConfig)(error, input, context);
      options.onError?.(error, input);
    },
    onSuccess: (
      response: IrminAPIResponse<TData>,
      input: TInput,
      context: unknown
    ) => {
      createOnSuccess(queryClient, options.cacheConfig, options.onSuccess)(
        response,
        input,
        context
      );
    },
  };
}

/**
 * Create a complete set of mutation handlers for update operations
 */
export function updateMutationHandlers<TData, TInput>(
  queryClient: QueryClient,
  options: UpdateMutationOptions<TData, TInput>
) {
  return {
    onMutate: updateOnMutate<TData, TInput>(
      queryClient,
      options.cacheConfig,
      options.singleItemQueryKey
    ),
    onError: (error: Error, input: TInput, context: unknown) => {
      rollbackOnError(
        queryClient,
        options.cacheConfig,
        options.singleItemQueryKey
      )(error, input, context);
      options.onError?.(error, input);
    },
    onSuccess: (
      response: IrminAPIResponse<TData>,
      input: TInput,
      context: unknown
    ) => {
      updateOnSuccess(
        queryClient,
        options.cacheConfig,
        options.singleItemQueryKey,
        options.onSuccess
      )(response, input, context);
    },
  };
}

/**
 * Create a complete set of mutation handlers for delete operations
 */
export function deleteMutationHandlers<TData>(
  queryClient: QueryClient,
  options: DeleteMutationOptions<TData>
) {
  return {
    onMutate: deleteOnMutate<TData>(
      queryClient,
      options.cacheConfig,
      options.singleItemQueryKey
    ),
    onError: (error: Error, itemId: string, context: unknown) => {
      rollbackOnError(
        queryClient,
        options.cacheConfig,
        options.singleItemQueryKey
      )(error, itemId, context);
      options.onError?.(error, itemId);
    },
    onSuccess: (
      response: IrminAPIResponse,
      itemId: string,
      context: unknown
    ) => {
      deleteOnSuccess(queryClient, options.cacheConfig, options.onSuccess)(
        response,
        itemId,
        context
      );
    },
  };
}
