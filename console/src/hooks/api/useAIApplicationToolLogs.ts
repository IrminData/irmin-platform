import { useCallback, useState } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import {
  aiApplicationToolLogsQueryKey,
  aiApplicationToolLogStatsQueryKey,
} from '@/lib/queryKeys';

import { useAIApplicationContext } from '@/context/AIApplicationContext';
import { useIrminCore } from '@/context/IrminCoreContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type {
  AIApplicationToolLogsResponse,
  AIApplicationToolLogStats,
} from '@/types/core/AIApplication';
import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

const DEFAULT_LIMIT = 50;

/**
 * Hook for fetching AI Application tool logs with pagination and filtering.
 *
 * @returns Tool logs query, stats query, pagination controls, and filter functions.
 */
export function useAIApplicationToolLogs() {
  const { getCore } = useIrminCore();
  const { workspaceSlug } = useWorkspaceContext();
  const { aiApplication } = useAIApplicationContext();
  const queryClient = useQueryClient();

  // Pagination state
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [offset, setOffset] = useState(0);

  // Filter state
  const [toolNameFilter, setToolNameFilter] = useState<string | undefined>(
    undefined
  );
  const [successFilter, setSuccessFilter] = useState<boolean | undefined>(
    undefined
  );

  // Fetch tool logs
  const toolLogsQuery = useQuery<
    IrminAPIResponse<AIApplicationToolLogsResponse>,
    Error
  >({
    queryKey: aiApplicationToolLogsQueryKey(
      workspaceSlug,
      aiApplication.id,
      limit,
      offset,
      toolNameFilter,
      successFilter
    ),
    queryFn: async () => {
      const core = await getCore();
      return await core.aiApplicationService.getToolLogs({
        workspace: workspaceSlug,
        aiApplicationId: aiApplication.id,
        limit,
        offset,
        toolName: toolNameFilter,
        success: successFilter,
      });
    },
  });

  // Fetch tool log stats
  const toolLogStatsQuery = useQuery<
    IrminAPIResponse<AIApplicationToolLogStats>,
    Error
  >({
    queryKey: aiApplicationToolLogStatsQueryKey(
      workspaceSlug,
      aiApplication.id
    ),
    queryFn: async () => {
      const core = await getCore();
      return await core.aiApplicationService.getToolLogStats({
        workspace: workspaceSlug,
        aiApplicationId: aiApplication.id,
      });
    },
  });

  // Pagination helpers
  const totalLogs = toolLogsQuery.data?.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalLogs / limit));

  // Clamp current page to valid range (handles case where total decreased)
  const rawCurrentPage = Math.floor(offset / limit) + 1;
  const currentPage = Math.min(rawCurrentPage, totalPages);

  // Auto-reset offset if it's out of bounds after data refresh
  const isOffsetOutOfBounds = totalLogs > 0 && offset >= totalLogs;
  if (isOffsetOutOfBounds && !toolLogsQuery.isLoading) {
    // Reset to first page on next render
    setOffset(0);
  }

  const goToPage = useCallback(
    (page: number) => {
      if (page < 1 || page > totalPages) {
        return;
      }
      setOffset((page - 1) * limit);
    },
    [limit, totalPages]
  );

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setOffset(offset + limit);
    }
  }, [currentPage, totalPages, offset, limit]);

  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      setOffset(Math.max(0, offset - limit));
    }
  }, [currentPage, offset, limit]);

  const setPageSize = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setOffset(0);
  }, []);

  // Filter helpers
  const filterByToolName = useCallback((toolName: string | undefined) => {
    setToolNameFilter(toolName);
    setOffset(0);
  }, []);

  const filterBySuccess = useCallback((success: boolean | undefined) => {
    setSuccessFilter(success);
    setOffset(0);
  }, []);

  const clearFilters = useCallback(() => {
    setToolNameFilter(undefined);
    setSuccessFilter(undefined);
    setOffset(0);
  }, []);

  // Refresh - also reset offset to avoid showing empty page if total decreased
  const refresh = useCallback(() => {
    setOffset(0);
    void queryClient.invalidateQueries({
      queryKey: ['ai_application_tool_logs', workspaceSlug, aiApplication.id],
    });
    void queryClient.invalidateQueries({
      queryKey: aiApplicationToolLogStatsQueryKey(
        workspaceSlug,
        aiApplication.id
      ),
    });
  }, [queryClient, workspaceSlug, aiApplication.id]);

  return {
    // Queries
    toolLogsQuery,
    toolLogStatsQuery,

    // Data
    logs: toolLogsQuery.data?.data?.logs ?? [],
    stats: toolLogStatsQuery.data?.data,
    totalLogs,
    loading: toolLogsQuery.isLoading,
    statsLoading: toolLogStatsQuery.isLoading,
    error: toolLogsQuery.error,
    statsError: toolLogStatsQuery.error,

    // Pagination
    currentPage,
    totalPages,
    limit,
    offset,
    goToPage,
    nextPage,
    prevPage,
    setPageSize,

    // Filters
    toolNameFilter,
    successFilter,
    filterByToolName,
    filterBySuccess,
    clearFilters,

    // Actions
    refresh,
  };
}
