'use client';

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';

import IrminCore from '@/lib/core';

import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/WorkspaceContext';

import { QueryResult } from '@/types/core/StoredQuery';

import { useIAM } from './IAMContext';
import { useLocale } from './LocaleContext';

/**
 * Query context properties
 */
interface QueryContextProps {
  loading: boolean;
  result: QueryResult | null;
  executeSql: (content: string) => Promise<void>;
}

const QueryContext = createContext<QueryContextProps | undefined>(undefined);

/**
 * Query context to provide query execution functionality,
 * and related state management.
 *
 * @param config - Query context provider configuration
 * @param config.children - Child components
 * @returns Query context provider
 */
export const QueryProvider = ({ children }: { children: React.ReactNode }) => {
  const { getToken } = useIAM();
  const { irminAlert } = usePopup();
  const { dict, locale } = useLocale();
  const { workspaceSlug } = useWorkspace();

  // Query state
  const [loading, setLoading] = useState<boolean>(false);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);

  // Flag to prevent multiple script executions at the same time
  const executing = useRef(false);

  /**
   * Execute a script
   *
   * The script can be either Irmin SQL query or a script to be executed in the Compute Sandbox.
   */
  const handleExecuteSql = useCallback(
    async (content: string) => {
      if (executing.current) return;
      executing.current = true;
      setLoading(true);
      try {
        irminAlert('info', dict.query.queryExecutionStarted);
        const token = await getToken();
        const irminCore = new IrminCore(locale, token);
        const res = await irminCore.queryService.executeSQL({
          workspace: workspaceSlug,
          sql: content,
        });
        if (res.message) irminAlert('info', res.message);
        setQueryResult(res.data ?? null);
      } catch (error) {
        console.error('QueryContext handleExecuteSql error', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to execute SQL query'
        );
      }
      setLoading(false);
      executing.current = false;
    },
    [irminAlert, dict, workspaceSlug, getToken, locale]
  );

  return (
    <QueryContext.Provider
      value={{
        loading,
        result: queryResult,
        executeSql: handleExecuteSql,
      }}
    >
      {children}
    </QueryContext.Provider>
  );
};

/**
 * Hook to use the Query context
 */
export const useQuery = () => {
  const context = useContext(QueryContext);
  if (!context) {
    throw new Error('useQuery must be used within a QueryProvider');
  }
  return context;
};
