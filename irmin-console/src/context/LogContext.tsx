'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import IrminCore from '@/services/core/IrminCore';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { LogEvent, WorkflowRunLogs } from '@/types/core/Log';

/**
 * Log context properties
 */
interface LogContextProps {
  // Log events state
  loadingLogEvents: boolean;
  logEvents: LogEvent[] | null;
  fetchLogEvents: (workflow?: string) => Promise<void>;
  // Workflow run logs state
  loadingWorkflowRunLogs: boolean;
  workflowRunLogs: WorkflowRunLogs | null;
  fetchWorkflowRunLogs: (
    workflow?: string,
    workflowRunID?: string
  ) => Promise<void>;
}

const LogContext = createContext<LogContextProps | undefined>(undefined);

/**
 * Log context to provide log interaction functionality.
 *
 * @param config - Log context provider configuration
 * @param config.children - Child components
 *
 * @returns Log context provider
 */
export const LogProvider = ({ children }: { children: React.ReactNode }) => {
  const { irminAlert } = usePopup();
  const { locale } = useLocale();

  // Log events state
  const [loadingLogEvents, setLoadingLogEvents] = useState<boolean>(false);
  const [logEvents, setLogEvents] = useState<LogEvent[] | null>(null);

  // Workflow run logs state
  const [loadingWorkflowRunLogs, setLoadingWorkflowRunLogs] =
    useState<boolean>(false);
  const [workflowRunLogs, setWorkflowRunLogs] =
    useState<WorkflowRunLogs | null>(null);

  const { logService } = useMemo(() => new IrminCore(locale), [locale]);

  /**
   * Fetch log events
   *
   * @param workflow - Optional. Slug of the workflow to fetch logs for
   */
  const fetchLogEvents = useCallback(
    async (workflow?: string) => {
      setLoadingLogEvents(true);
      setLogEvents(null);
      try {
        const res = await logService.fetchLogEvents(workflow);
        setLogEvents(res.data);
      } catch (error) {
        console.error('LogContext fetchLogEvents error', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to fetch log events'
        );
      } finally {
        setLoadingLogEvents(false);
      }
    },
    [logService, irminAlert]
  );

  /**
   * Fetch workflow run logs
   *
   * @param workflow - Optional. Slug of the workflow to fetch logs for
   * @param workflowRunID - Optional. ID of the workflow run to fetch logs for
   */
  const fetchWorkflowRunLogs = useCallback(
    async (workflow?: string, workflowRunID?: string) => {
      setLoadingWorkflowRunLogs(true);
      setWorkflowRunLogs(null);
      try {
        const res = await logService.fetchWorkflowRunLogs(
          workflow,
          workflowRunID
        );
        setWorkflowRunLogs(res.data);
      } catch (error) {
        console.error('LogContext fetchWorkflowRunLogs error', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to fetch workflow run logs'
        );
      } finally {
        setLoadingWorkflowRunLogs(false);
      }
    },
    [logService, irminAlert]
  );

  return (
    <LogContext.Provider
      value={{
        // Log events state
        loadingLogEvents,
        logEvents,
        fetchLogEvents,
        // Workflow run logs state
        loadingWorkflowRunLogs,
        workflowRunLogs,
        fetchWorkflowRunLogs,
      }}
    >
      {children}
    </LogContext.Provider>
  );
};

/**
 * Hook to use the log context
 */
export const useLogs = () => {
  const context = useContext(LogContext);
  if (!context) {
    throw new Error('useLogs must be used within a LogProvider');
  }
  return context;
};
