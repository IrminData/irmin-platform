import { useCallback, useRef, useState } from 'react';

import {
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from '@tanstack/react-query';

import IrminCore from '@/lib/core';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import {
  IrminAPIPaginationMetadata,
  IrminAPIResponse,
} from '@/types/core/IrminAPIResponse';
import { LogEvent } from '@/types/core/Log';

/**
 * Types of entities for which logs can be fetched
 */
type LogsForType =
  | 'workspace'
  | 'workflow'
  | 'repository'
  | 'connection'
  | 'user';

interface LogEventsResponse extends IrminAPIResponse<LogEvent[]> {
  pagination?: IrminAPIPaginationMetadata;
}

export const logEventsQueryKey = (
  workspaceSlug: string,
  logsForType: LogsForType,
  logsFor: string,
  page: number,
  search?: string
) => ['log-events', workspaceSlug, logsForType, logsFor, page, search] as const;

/**
 * Fetch paginated log events for a workspace, workflow, repository, connection, or user.
 *
 * @param options - hook configuration
 * @returns pagination state and control functions
 */
export const useLogEvents = (
  options: {
    /** number of events per page */
    perPage?: number;
    /** type of logs to fetch */
    logsForType?: LogsForType;
    /** ID or slug of the target entity */
    logsFor?: string;
  } = {}
) => {
  const { perPage = 100, logsForType = 'workspace', logsFor = '' } = options;

  const { getToken } = useIAM();
  const { locale } = useLocale();
  const { workspaceSlug } = useWorkspaceContext();
  const { irminAlert } = usePopup();
  const queryClient = useQueryClient();

  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLogs = useCallback(
    async (search?: string) => {
      const token = await getToken();
      const irminCore = new IrminCore(locale, token);

      switch (logsForType) {
        case 'workspace':
          return irminCore.logService.fetchLogEvents({
            workspace: logsFor || workspaceSlug,
            search,
            perPage,
            page: currentPage,
          });

        case 'workflow':
          return irminCore.logService.fetchWorkflowLogEvents({
            workspace: workspaceSlug,
            workflow_id: logsFor,
            search,
            perPage,
            page: currentPage,
          });

        case 'repository':
          return irminCore.logService.fetchRepositoryLogEvents({
            workspace: workspaceSlug,
            repository: logsFor,
            search,
            perPage,
            page: currentPage,
          });

        case 'connection':
          return irminCore.logService.fetchConnectionLogEvents({
            workspace: workspaceSlug,
            connection_id: logsFor,
            perPage,
            page: currentPage,
          });

        case 'user':
          return irminCore.logService.fetchUserLogEvents({
            workspace: workspaceSlug,
            user_id: logsFor,
            perPage,
            page: currentPage,
          });

        default:
          throw new Error(`Unknown logsForType: ${logsForType}`);
      }
    },
    [
      locale,
      workspaceSlug,
      logsForType,
      logsFor,
      perPage,
      currentPage,
      getToken,
    ]
  );

  const queryOptions: UseQueryOptions<LogEventsResponse, Error> = {
    queryKey: logEventsQueryKey(
      workspaceSlug,
      logsForType,
      logsFor,
      currentPage,
      searchQuery
    ),
    queryFn: () => fetchLogs(searchQuery),
  };

  const logEventsQuery = useQuery<LogEventsResponse, Error>(queryOptions);

  // Handle errors
  if (logEventsQuery.isError) {
    console.error('Failed to fetch log events:', logEventsQuery.error);
    irminAlert(
      'error',
      logEventsQuery.error.message || 'Failed to fetch log events'
    );
  }

  const goToPage = useCallback(
    (page: number) => {
      const totalPages = logEventsQuery.data?.pagination?.total_pages ?? 1;
      if (page < 1 || page > totalPages) {
        console.error('Invalid page number', page);
        return;
      }
      setCurrentPage(page);
    },
    [logEventsQuery.data?.pagination?.total_pages]
  );

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ['log-events', workspaceSlug, logsForType, logsFor],
    });
  }, [queryClient, workspaceSlug, logsForType, logsFor]);

  // Debounced search query effect
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleSearchQueryChange = useCallback((query: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      const q = query.trim();
      if (q.length === 0 || q.length >= 3) {
        setCurrentPage(1);
        setSearchQuery(q);
      }
    }, 400);
  }, []);

  return {
    logEvents: logEventsQuery.data?.data ?? [],
    loading: logEventsQuery.isLoading,
    totalItems: logEventsQuery.data?.pagination?.total ?? 0,
    currentPage,
    totalPages: logEventsQuery.data?.pagination?.total_pages ?? 1,
    refresh,
    goToPage,
    setSearchQuery: handleSearchQueryChange,
  };
};
