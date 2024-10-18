'use client';

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';

import { QueryExecutionResultAPIResponse } from '@/services/core/resources/QueryService';

import { usePopup } from '@/context/PopupContext';

import { IrminFileType } from '@/types/core/Bucket';
import { Collection } from '@/types/core/Collection';

import { useIrminCore } from './IrminCoreContext';

/**
 * Query context properties
 */
interface QueryContextProps {
  loading: boolean;
  result: QueryExecutionResultAPIResponse | null;
  executeScript: (
    type: IrminFileType,
    content: string,
    collection?: Collection
  ) => Promise<void>;
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

  const { irminCore } = useIrminCore();

  // Query state
  const [loading, setLoading] = useState<boolean>(false);
  const [queryResult, setQueryResult] =
    useState<QueryExecutionResultAPIResponse | null>(null);

  // Flag to prevent multiple script executions at the same time
  const executing = useRef(false);

  /**
   * Execute a script
   *
   * The script can be either Irmin SQL query or a script to be executed in the Action Wrapper.
   */
  const executeScript = useCallback(
    async (type: IrminFileType, content: string, collection?: Collection) => {
      if (executing.current) return;
      executing.current = true;
      setLoading(true);
      try {
        const res = await irminCore.queryService.executeScript(
          type,
          content,
          collection?.type
        );
        setQueryResult(res);
      } catch (error) {
        console.error('QueryContext executeScript error', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to run script'
        );
      }
      setLoading(false);
      executing.current = false;
    },
    [irminCore.queryService, irminAlert]
  );

  return (
    <QueryContext.Provider
      value={{
        loading,
        result: queryResult,
        executeScript,
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
