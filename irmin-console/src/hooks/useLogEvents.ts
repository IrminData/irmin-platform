import { useCallback, useEffect, useState } from 'react';

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
  /** current page index */
  currentPage: number;
  /** total number of pages */
  totalPages: number;
  /** re-fetch events for current page */
  refresh: () => void;
  /** navigate to a given page */
  goToPage: (page: number) => void;
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
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  /**
   * Fetch log events for the current page and options
   */
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const irminCore = new IrminCore(locale, token);
      let res;

      switch (logsForType) {
        case 'workspace':
          res = await irminCore.logService.fetchLogEvents({
            workspace: logsFor || workspaceSlug,
            perPage,
            page: currentPage,
          });
          break;

        case 'workflow':
          res = await irminCore.logService.fetchWorkflowLogEvents({
            workspace: workspaceSlug,
            workflow_id: logsFor,
            perPage,
            page: currentPage,
          });
          break;

        case 'repository':
          res = await irminCore.logService.fetchRepositoryLogEvents({
            workspace: workspaceSlug,
            repository_id: logsFor,
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
  }, [
    locale,
    workspaceSlug,
    logsForType,
    logsFor,
    perPage,
    currentPage,
    irminAlert,
  ]);

  // Refetch when options or page change
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

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
    },
    [totalPages]
  );

  return {
    logEvents,
    loading,
    currentPage,
    totalPages,
    refresh: fetchLogs,
    goToPage,
  };
};
