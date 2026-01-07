import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import IrminCore from '@/lib/core';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type {
  EmbeddingConfig,
  EmbeddingFile,
  EmbeddingSearchResponse,
} from '@/types/core/Embedding';
import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

/**
 * Hook for embeddings operations (vectorize, search, list, get info).
 *
 * @param repositorySlug - The repository slug.
 * @param ref - (optional) The ref (branch, tag or commit hash).
 */
export const useEmbeddings = (repositorySlug: string, ref?: string) => {
  const { getToken } = useIAM();
  const { locale, dict } = useLocale();
  const { workspaceSlug } = useWorkspaceContext();
  const { irminAlert } = usePopup();
  const queryClient = useQueryClient();

  /**
   * Query to list embedding files in a repository.
   */
  const listEmbeddingsQuery = useQuery({
    queryKey: ['embeddings', workspaceSlug, repositorySlug, ref ?? ''],
    queryFn: async () => {
      const token = await getToken();
      const irminCore = new IrminCore(locale, token);
      return irminCore.embeddingsService.listEmbeddings({
        workspace: workspaceSlug,
        repository: repositorySlug,
        ref: ref,
      });
    },
    enabled: !!repositorySlug,
  });

  /**
   * Mutation to vectorize repository objects.
   */
  const vectorizeObjectsMutation = useMutation<
    IrminAPIResponse<EmbeddingFile>,
    Error,
    {
      sourcePaths: string[];
      outputPath: string;
      ref?: string;
      config?: EmbeddingConfig;
    }
  >({
    mutationFn: async ({
      sourcePaths,
      outputPath,
      ref: mutationRef,
      config,
    }) => {
      const token = await getToken();
      const irminCore = new IrminCore(locale, token);
      return irminCore.embeddingsService.vectorizeObjects({
        workspace: workspaceSlug,
        repository: repositorySlug,
        sourcePaths,
        outputPath,
        ref: mutationRef ?? ref,
        config,
      });
    },
    onSuccess: (res) => {
      // Invalidate embeddings list query for all refs
      queryClient.invalidateQueries({
        queryKey: ['embeddings', workspaceSlug, repositorySlug],
      });
      // Invalidate repository object queries to show new embedding file
      queryClient.invalidateQueries({
        queryKey: ['repositoryObject', workspaceSlug, repositorySlug],
      });
      irminAlert(
        'success',
        res.message ??
          dict.repository.objects.vectorizeSuccess ??
          'Embeddings created successfully'
      );
    },
    onError: (error) => {
      irminAlert(
        'error',
        error.message ??
          dict.repository.objects.vectorizeError ??
          'Failed to create embeddings'
      );
    },
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
      const token = await getToken();
      const irminCore = new IrminCore(locale, token);
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

  return {
    // Queries
    listEmbeddingsQuery,

    // Mutations
    vectorizeObjectsMutation,
    searchEmbeddingsMutation,
  };
};
