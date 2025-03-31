'use client';

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';

import { executeSQL } from '@/lib/actions/query';

import { usePopup } from '@/context/PopupContext';

import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

import { useWorkspace } from './WorkspaceContext';

/**
 * Query context properties
 */
interface QueryContextProps {
  loading: boolean;
  result: IrminAPIResponse<any[]> | null;
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
  const { irminAlert } = usePopup();
  const { workspaceSlug } = useWorkspace();

  // Query state
  const [loading, setLoading] = useState<boolean>(false);
  const [queryResult, setQueryResult] = useState<IrminAPIResponse<
    any[]
  > | null>(null);

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
        const res = await executeSQL({
          workspace: workspaceSlug,
          sql: content,
        });
        setQueryResult(res);
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
    [irminAlert, workspaceSlug]
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
