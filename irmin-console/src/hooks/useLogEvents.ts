import { useCallback, useEffect, useRef, useState } from 'react';

import IrminCore from '@/lib/core';
import { getToken } from '@/lib/getToken';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/WorkspaceContext';

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

/**
 * Hook options for fetching log events
 */
interface UseLogEventsOptions {
  /** number of events per page */
  perPage?: number;
  /** type of logs to fetch */
  logsForType?: LogsForType;
  /** ID or slug of the target entity */
  logsFor?: string;
}

/**
 * Result of the log events hook
 */
interface UseLogEventsResult {
  /** array of fetched log events */
  logEvents: LogEvent[];
  /** whether data is being loaded */
  loading: boolean;
  /** total number of log events found */
  totalItems: number;
  /** current page index */
  currentPage: number;
  /** total number of pages */
  totalPages: number;
  /** re-fetch events for current page */
  refresh: () => void;
  /** navigate to a given page */
  goToPage: (page: number) => void;
  /** set search query */
  setSearchQuery: (query: string) => void;
}

/**
 * Fetch paginated log events for a workspace, workflow, repository, connection, or user.
 *
 * @param options - hook configuration
 * @returns pagination state and control functions
 */
export const useLogEvents = (
  options: UseLogEventsOptions = {}
): UseLogEventsResult => {
  const { perPage = 100, logsForType = 'workspace', logsFor = '' } = options;

  const { locale } = useLocale();
  const { workspaceSlug } = useWorkspace();
  const { irminAlert } = usePopup();

  const [logEvents, setLogEvents] = useState<LogEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  /**
   * Fetch log events for the current page and options
   */
  const fetchLogs = useCallback(
    async (search?: string) => {
      setLoading(true);
      try {
        const token = await getToken();
        const irminCore = new IrminCore(locale, token);
        let res;

        switch (logsForType) {
          case 'workspace':
            res = await irminCore.logService.fetchLogEvents({
              workspace: logsFor || workspaceSlug,
              search,
              perPage,
              page: currentPage,
            });
            break;

          case 'workflow':
            res = await irminCore.logService.fetchWorkflowLogEvents({
              workspace: workspaceSlug,
              workflow_id: logsFor,
              search,
              perPage,
              page: currentPage,
            });
            break;

          case 'repository':
            res = await irminCore.logService.fetchRepositoryLogEvents({
              workspace: workspaceSlug,
              repository: logsFor,
              search,
              perPage,
              page: currentPage,
            });
            break;

          case 'connection':
            res = await irminCore.logService.fetchConnectionLogEvents({
              workspace: workspaceSlug,
              connection_id: logsFor,
              perPage,
              page: currentPage,
            });
            break;

          case 'user':
            res = await irminCore.logService.fetchUserLogEvents({
              workspace: workspaceSlug,
              user_id: logsFor,
              perPage,
              page: currentPage,
            });
            break;

          default:
            throw new Error(`Unknown logsForType: ${logsForType}`);
        }

        setTotalPages(res.pagination?.total_pages ?? 1);
        setTotalItems(res.pagination?.total ?? 0);
        setLogEvents(res.data ?? []);
      } catch (error) {
        console.error('Failed to fetch log events:', error);
        irminAlert(
          'error',
          (error as Error)?.message || 'Failed to fetch log events'
        );
      } finally {
        setLoading(false);
      }
    },
    [
      locale,
      workspaceSlug,
      logsForType,
      logsFor,
      perPage,
      currentPage,
      irminAlert,
    ]
  );

  // Filter items based on search query
  const searchedForQueryRef = useRef<string>('');
  useEffect(() => {
    // set up debounce
    const handler = setTimeout(() => {
      const q = searchQuery.trim();
      // if query is empty, but we have a previous one, reset page and fetch
      if (q.length === 0 && searchedForQueryRef.current.length > 0) {
        searchedForQueryRef.current = '';
        setCurrentPage(1);
        fetchLogs();
        return;
      }
      // ignore short queries and record them so we don’t loop
      if (q.length < 3) {
        searchedForQueryRef.current = q;
        return;
      }
      // if we’ve already fetched this exact query, bail out
      if (searchedForQueryRef.current === q) return;
      // new query: mark it, reset page and fire fetch
      searchedForQueryRef.current = q;
      setCurrentPage(1);
      fetchLogs(q);
    }, 400);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery, fetchLogs]);

  // Fetch logs on mount
  const initialFetchDoneForRef = useRef('');
  useEffect(() => {
    const optionsStr = JSON.stringify(options);
    if (initialFetchDoneForRef.current === optionsStr) return;
    initialFetchDoneForRef.current = optionsStr;
    fetchLogs();
  }, [fetchLogs, options]);

  /**
   * Go to a specific page
   *
   * @param page - new page number
   */
  const goToPage = useCallback(
    (page: number) => {
      if (page < 1 || page > totalPages) {
        console.error('Invalid page number', page);
        return;
      }
      setCurrentPage(page);
      fetchLogs();
    },
    [totalPages, fetchLogs]
  );

  return {
    logEvents,
    loading,
    totalItems,
    currentPage,
    totalPages,
    refresh: fetchLogs,
    goToPage,
    setSearchQuery,
  };
};
