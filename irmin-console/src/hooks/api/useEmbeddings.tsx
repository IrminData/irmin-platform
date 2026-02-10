import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useIrminCore } from '@/context/IrminCoreContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type {
  EmbeddingConfig,
  EmbeddingFile,
  EmbeddingSearchResponse,
  UpsertEmbeddingItem,
  UpsertEmbeddingsResponse,
} from '@/types/core/Embedding';
import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

import { useInvalidateObjectQueries } from './useInvalidateObjectQueries';

/**
 * Hook for embeddings operations (vectorize, search, list, get info).
 *
 * @param repositorySlug - The repository slug.
 * @param ref - (optional) The ref (branch, tag or commit hash).
 * @param embeddingPath - (optional) Path to a specific embedding file for info queries.
 */
export const useEmbeddings = (
  repositorySlug: string,
  ref?: string,
  embeddingPath?: string
) => {
  const { getCore } = useIrminCore();
  const { dict } = useLocale();
  const { workspaceSlug } = useWorkspaceContext();
  const { irminAlert } = usePopup();
  const queryClient = useQueryClient();
  const { invalidateObjectQueries } = useInvalidateObjectQueries(
    workspaceSlug,
    repositorySlug
  );

  /**
   * Query to list embedding files in a repository.
   */
  const listEmbeddingsQuery = useQuery({
    queryKey: ['embeddings', workspaceSlug, repositorySlug, ref ?? ''],
    queryFn: async () => {
      const irminCore = await getCore();
      return irminCore.embeddingsService.listEmbeddings({
        workspace: workspaceSlug,
        repository: repositorySlug,
        ref: ref,
      });
    },
    enabled: !!repositorySlug,
  });

  /**
   * Query to get info about a specific embedding file.
   */
  const embeddingInfoQuery = useQuery<IrminAPIResponse<EmbeddingFile>>({
    queryKey: [
      'embeddingInfo',
      workspaceSlug,
      repositorySlug,
      embeddingPath ?? '',
      ref ?? '',
    ],
    queryFn: async () => {
      const irminCore = await getCore();
      return irminCore.embeddingsService.getEmbeddingInfo({
        workspace: workspaceSlug,
        repository: repositorySlug,
        embeddingPath: embeddingPath!,
        ref,
      });
    },
    enabled: !!repositorySlug && !!embeddingPath,
    retry: false,
  });

  /**
   * Mutation to search embeddings.
   */
  const searchEmbeddingsMutation = useMutation<
    IrminAPIResponse<EmbeddingSearchResponse>,
    Error,
    {
      query: string;
      embeddingPath: string;
      ref?: string;
      topK?: number;
      filter?: Record<string, string>;
    }
  >({
    mutationFn: async ({
      query,
      embeddingPath,
      ref: mutationRef,
      topK,
      filter,
    }) => {
      const irminCore = await getCore();
      return irminCore.embeddingsService.searchEmbeddings({
        workspace: workspaceSlug,
        repository: repositorySlug,
        query,
        embeddingPath,
        ref: mutationRef ?? ref,
        topK,
        filter,
      });
    },
    onError: (error) => {
      irminAlert(
        'error',
        error.message ??
          dict.repository.objects.searchVectorsError ??
          'Failed to search embeddings'
      );
    },
  });

  /**
   * Mutation to upsert embeddings with deduplication.
   */
  const upsertEmbeddingsMutation = useMutation<
    IrminAPIResponse<UpsertEmbeddingsResponse>,
    Error,
    {
      outputPath: string;
      sourcePaths?: string[];
      embeddings?: UpsertEmbeddingItem[];
      ref?: string;
      config?: EmbeddingConfig;
      metadata?: Record<string, string>;
      priority?: number;
    }
  >({
    mutationFn: async ({
      outputPath,
      sourcePaths,
      embeddings,
      ref: mutationRef,
      config,
      metadata,
      priority,
    }) => {
      const irminCore = await getCore();
      return irminCore.embeddingsService.upsertEmbeddings({
        workspace: workspaceSlug,
        repository: repositorySlug,
        outputPath,
        sourcePaths,
        embeddings,
        ref: mutationRef ?? ref,
        config,
        metadata,
        priority,
      });
    },
    onSuccess: (res, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['embeddings', workspaceSlug, repositorySlug],
      });
      const effectiveRef = variables.ref ?? ref ?? '';
      invalidateObjectQueries(variables.outputPath, effectiveRef);
      const data = res.data;
      irminAlert(
        'success',
        res.message ??
          `Embeddings upserted: ${data?.inserted ?? 0} inserted, ${data?.skipped ?? 0} skipped, ${data?.updated ?? 0} updated`
      );
    },
    onError: (error) => {
      irminAlert('error', error.message ?? 'Failed to upsert embeddings');
    },
  });

  /**
   * Mutation to update embedding metadata.
   */
  const updateEmbeddingMetadataMutation = useMutation<
    IrminAPIResponse<void>,
    Error,
    {
      embeddingPath: string;
      updates: Record<string, Record<string, string>>;
      ref?: string;
    }
  >({
    mutationFn: async ({ embeddingPath, updates, ref: mutationRef }) => {
      const irminCore = await getCore();
      return irminCore.embeddingsService.updateEmbeddingMetadata({
        workspace: workspaceSlug,
        repository: repositorySlug,
        embeddingPath,
        updates,
        ref: mutationRef ?? ref,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({
        queryKey: ['embeddings', workspaceSlug, repositorySlug],
      });
      irminAlert('success', res.message ?? 'Metadata updated successfully');
    },
    onError: (error) => {
      irminAlert('error', error.message ?? 'Failed to update metadata');
    },
  });

  /**
   * Mutation to update embedding priority.
   */
  const updateEmbeddingPriorityMutation = useMutation<
    IrminAPIResponse<void>,
    Error,
    {
      embeddingPath: string;
      updates: Record<string, number>;
      ref?: string;
    }
  >({
    mutationFn: async ({ embeddingPath, updates, ref: mutationRef }) => {
      const irminCore = await getCore();
      return irminCore.embeddingsService.updateEmbeddingPriority({
        workspace: workspaceSlug,
        repository: repositorySlug,
        embeddingPath,
        updates,
        ref: mutationRef ?? ref,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({
        queryKey: ['embeddings', workspaceSlug, repositorySlug],
      });
      irminAlert('success', res.message ?? 'Priority updated successfully');
    },
    onError: (error) => {
      irminAlert('error', error.message ?? 'Failed to update priority');
    },
  });

  return {
    // Queries
    listEmbeddingsQuery,
    embeddingInfoQuery,

    // Mutations
    searchEmbeddingsMutation,
    upsertEmbeddingsMutation,
    updateEmbeddingMetadataMutation,
    updateEmbeddingPriorityMutation,
  };
};
