'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  ActionSingleRunData,
  ActionSingleRunRequest,
} from '@/app/api/action-single-run/types';
import { fetchSingle } from '@/services/data/action';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/workspace';

/**
 * Data context properties
 *
 * @typeParam loading - Loading state of data operations
 * @typeParam dataResults - Data results from the data lakehouse
 * @typeParam fetchActionSingleResults - Fetch single action results from the data lakehouse
 */
interface DataContextProps {
  loading: boolean;
  dataResults: ActionSingleRunData | null;
  fetchActionSingleResults: (request: ActionSingleRunRequest) => Promise<void>;
}

const DataContext = createContext<DataContextProps | undefined>(undefined);

/**
 * Data context to provide data lakehouse interaction functionality
 *
 * @param config - Data context provider configuration
 * @param config.children - Child components
 *
 * @returns Data context provider
 */
export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const { irminAlert } = usePopup();
  const { token } = useIAM();
  const { locale } = useLocale();
  const {
    workspaces: { currentWorkspace },
  } = useWorkspace();

  const [loading, setLoading] = useState<boolean>(false);
  const [dataResults, setDataResults] = useState<ActionSingleRunData | null>(
    null
  );

  // Ref to check which workspace the data was fetched for
  const dataFetchedForRef = useRef<string | null>(null);

  /**
   * Fetch single action results from the data lakehouse
   *
   * @param actionId - ID of the action to fetch results for
   */
  const fetchActionSingleResults = useCallback(
    async (request: ActionSingleRunRequest) => {
      if (!request) return;
      setLoading(true);
      try {
        // Fetch data action results
        const response = await fetchSingle({
          locale,
          token: token ?? '',
          workspace: currentWorkspace?.slug ?? '',
          request: request,
        });

        if (!response || !response.data) return;
        setDataResults(response.data);
      } catch (error) {
        console.error('DataContext fetchActionSingleResults error', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to fetch action results'
        );
      } finally {
        setLoading(false);
      }
    },
    [locale, token, currentWorkspace, irminAlert]
  );

  /**
   * Hook to fetch data when the workspace changes
   */
  useEffect(() => {
    if (currentWorkspace?.slug !== dataFetchedForRef.current) {
      dataFetchedForRef.current = currentWorkspace?.slug ?? '';
    }
  }, [currentWorkspace]);

  return (
    <DataContext.Provider
      value={{
        loading,
        dataResults,
        fetchActionSingleResults,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

/**
 * Hook to use the data context
 */
export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
