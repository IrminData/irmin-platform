'use client';

import { createContext, useCallback, useContext, useState } from 'react';

import { usePopup } from '@/context/PopupContext';

import { useIrminSQL } from '@/hooks/utils';

import type { QueryResult } from '@/types/core/StoredQuery';
import type { ActionInputData } from '@/types/core/Workflow';

import { useLocale } from './LocaleContext';

/**
 * Query context properties
 */
interface QueryContextProps {
  loading: boolean;
  result: QueryResult | null;
  executeSql: (
    _content: string,
    _limitResponse?: boolean,
    _input?: ActionInputData[]
  ) => Promise<void>;
  cleanup: () => void;
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
  const { irminAlert } = usePopup();
  const { dict } = useLocale();

  const { executeSQLMutation } = useIrminSQL();
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);

  /**
   * Execute a SQL query
   *
   * The query can be either ad-hoc SQL or a stored query with optional input files.
   */
  const handleExecuteSql = useCallback(
    async (
      content: string,
      limitResponse?: boolean,
      input?: ActionInputData[]
    ) => {
      try {
        irminAlert('info', dict.query.queryExecutionStarted);
        const res = await executeSQLMutation.mutateAsync({
          sql: content,
          limitResponse,
          input,
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
    },
    [irminAlert, dict, executeSQLMutation]
  );

  /**
   * Cleanup function to reset the query state
   */
  const cleanup = useCallback(() => {
    setQueryResult(null);
  }, []);

  return (
    <QueryContext.Provider
      value={{
        loading: executeSQLMutation.isPending,
        result: queryResult,
        executeSql: handleExecuteSql,
        cleanup,
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
