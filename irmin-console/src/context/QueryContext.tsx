'use client';

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';

import { executeScript, getQueryResults } from '@/lib/actions/query';

import { usePopup } from '@/context/PopupContext';

import { IrminFileType } from '@/types/core/EditorItems';
import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { QueryExecutionResult } from '@/types/core/StoredQuery';

/**
 * Query context properties
 */
interface QueryContextProps {
  loading: boolean;
  result: IrminAPIResponse<QueryExecutionResult> | null;
  executeScript: (type: IrminFileType, content: string) => Promise<void>;
  getQueryResult: (queryId: string, page: number) => Promise<void>;
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

  // Query state
  const [loading, setLoading] = useState<boolean>(false);
  const [queryResult, setQueryResult] =
    useState<IrminAPIResponse<QueryExecutionResult> | null>(null);

  // Flag to prevent multiple script executions at the same time
  const executing = useRef(false);

  /**
   * Execute a script
   *
   * The script can be either Irmin SQL query or a script to be executed in the Compute Sandbox.
   */
  const handleExecuteScript = useCallback(
    async (type: IrminFileType, content: string) => {
      if (executing.current) return;
      executing.current = true;
      setLoading(true);
      try {
        const res = await executeScript(type, content);
        setQueryResult(res);
      } catch (error) {
        console.error('QueryContext handleExecuteScript error', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to run script'
        );
      }
      setLoading(false);
      executing.current = false;
    },
    [irminAlert]
  );

  /**
   * Set query result to a stored value
   */
  const handleGetQueryResult = useCallback(
    async (queryId: string, page: number) => {
      if (executing.current) return;
      executing.current = true;
      setLoading(true);
      try {
        const res = await getQueryResults(queryId, page);
        if (!res.data)
          throw new Error(res.message ?? 'Failed to get query results');
        setQueryResult(res);
      } catch (error) {
        console.error('QueryContext handleGetQueryResult error', error);
      }
      setLoading(false);
      executing.current = false;
    },
    []
  );

  return (
    <QueryContext.Provider
      value={{
        loading,
        result: queryResult,
        executeScript: handleExecuteScript,
        getQueryResult: handleGetQueryResult,
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
