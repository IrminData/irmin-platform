import type { QueryKey } from '@tanstack/react-query';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

/**
 * Configuration for mutation cache management
 */
export interface MutationCacheConfig<TData, TInput = unknown> {
  /** Primary query key that will be updated */
  primaryQueryKey: QueryKey;
  /** Additional query keys to invalidate or update */
  relatedQueryKeys?: QueryKey[];
  /** Function to extract the identifier from the data */
  getItemId: (item: TData) => string;
  /** Function to extract the identifier from the input (defaults to looking for 'id' field) */
  getInputId?: (input: TInput) => string;
  /** Function to create optimistic data for create mutations */
  createOptimisticItem?: (input: TInput, tempId: string) => TData;
}

/**
 * Context returned from onMutate for rollback purposes
 */
export interface MutationContext<TData = unknown> {
  previousData?: IrminAPIResponse<TData[]>;
  previousSingleData?: IrminAPIResponse<TData>;
  tempId?: string;
  relatedPreviousData?: Map<string, unknown>;
}

/**
 * Options for create mutations
 */
export interface CreateMutationOptions<TData, TInput> {
  cacheConfig: MutationCacheConfig<TData, TInput>;
  onSuccess?: (data: IrminAPIResponse<TData>, input: TInput) => void;
  onError?: (error: Error, input: TInput) => void;
}

/**
 * Options for update mutations
 */
export interface UpdateMutationOptions<TData, TInput> {
  cacheConfig: MutationCacheConfig<TData, TInput>;
  /** Query key for the single item being updated */
  singleItemQueryKey?: QueryKey;
  onSuccess?: (data: IrminAPIResponse<TData>, input: TInput) => void;
  onError?: (error: Error, input: TInput) => void;
}

/**
 * Options for delete mutations
 */
export interface DeleteMutationOptions<TData> {
  cacheConfig: MutationCacheConfig<TData>;
  /** Query key for the single item being deleted */
  singleItemQueryKey?: QueryKey;
  onSuccess?: (data: IrminAPIResponse, itemId: string) => void;
  onError?: (error: Error, itemId: string) => void;
}
