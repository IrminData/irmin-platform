import { useCallback, useEffect, useState } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import IrminCore from '@/lib/core';
import { repositoryCommitsQueryKey } from '@/lib/queryKeys';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { Commit } from '@/types/core/Commit';
import type {
  IrminAPIPaginationMetadata,
  IrminAPIResponse,
} from '@/types/core/IrminAPIResponse';

interface CommitsResponse extends IrminAPIResponse<Commit[]> {
  pagination?: IrminAPIPaginationMetadata;
}

/**
 * Custom hook to manage fetching and pagination of repository commits
 * Uses cursor-based pagination with the 'after' parameter
 *
 * @param repositorySlug - unique identifier of the repository
 * @returns pagination state and control functions
 */
export function useRepositoryCommits(repositorySlug: string, branch?: string) {
  const { getToken } = useIAM();
  const { locale } = useLocale();
  const { workspaceSlug } = useWorkspaceContext();
  const queryClient = useQueryClient();

  const [hasMore, setHasMore] = useState(false);
  const [after, setAfter] = useState<string>('');
  const [accumulatedCommits, setAccumulatedCommits] = useState<Commit[]>([]);

  const commitsQuery = useQuery<CommitsResponse, Error>({
    queryKey: repositoryCommitsQueryKey(
      workspaceSlug,
      repositorySlug,
      branch,
      after
    ),
    queryFn: async () => {
      const token = await getToken();
      const irminCore = new IrminCore(locale, token);
      const res = await irminCore.repositoryCommitService.fetchCommits({
        workspace: workspaceSlug,
        repository: repositorySlug,
        ref: branch,
        perPage: 20,
        after,
      });

      setHasMore(res.pagination?.has_more ?? false);

      return res;
    },
  });

  // Reset accumulated commits when branch changes
  useEffect(() => {
    setAccumulatedCommits([]);
  }, [branch]);

  // Update accumulated commits when new data arrives
  useEffect(() => {
    const newCommits = commitsQuery.data?.data;
    if (newCommits) {
      setAccumulatedCommits((prev) => {
        // If after is empty, we're on the first page, so replace the array
        if (!after) return [...newCommits];
        // Otherwise append new commits
        return [...prev, ...newCommits];
      });
    }
  }, [commitsQuery.data?.data, after]);

  const loadMoreCommits = useCallback(async () => {
    if (!hasMore || !commitsQuery.data?.pagination?.next) return;
    setAfter(commitsQuery.data.pagination.next);
  }, [commitsQuery.data, hasMore]);

  const resetCommits = useCallback(() => {
    setAfter('');
    setHasMore(false);
    setAccumulatedCommits([]);
    void queryClient.invalidateQueries({
      queryKey: repositoryCommitsQueryKey(
        workspaceSlug,
        repositorySlug,
        branch,
        ''
      ),
    });
  }, [queryClient, workspaceSlug, repositorySlug, branch]);

  return {
    // Queries
    commitsQuery,

    // Accumulated commits across all pages
    commits: accumulatedCommits,

    // Pagination
    loadMoreCommits,
    resetCommits,
    hasMore,
    after,
  };
}
