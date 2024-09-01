'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';

import {
  ActionSingleRunData,
  ActionSingleRunRequest,
} from '@/app/api/action-single-run/types';
import { SchemaResponse } from '@/app/api/schema/types';
import { fetchSchema, fetchSingle } from '@/services/data';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/workspace';

/**
 * Data context properties
 *
 * @typeParam loadingData - Loading state of data operations
 * @typeParam dataResults - Data results from the data lakehouse
 * @typeParam fetchActionSingleResults - Fetch single action results from the data lakehouse
 */
interface DataContextProps {
  loadingData: boolean;
  dataResults: ActionSingleRunData | null;
  loadingSchema: boolean;
  schemaResults: SchemaResponse | null;
  fetchActionSingleResults: (request: ActionSingleRunRequest) => Promise<void>;
  fetchSchemaForTables: (tables: string[]) => Promise<void>;
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

  // Data state
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [dataResults, setDataResults] = useState<ActionSingleRunData | null>(
    null
  );

  // Schema state
  const [loadingSchema, setLoadingSchema] = useState<boolean>(false);
  const [schemaResults, setSchemaResults] = useState<SchemaResponse | null>(
    null
  );

  /**
   * Fetch single action results from the data lakehouse
   *
   * @param actionId - ID of the action to fetch results for
   */
  const fetchActionSingleResults = useCallback(
    async (request: ActionSingleRunRequest) => {
      if (!request) return;
      setLoadingData(true);
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
        setLoadingData(false);
      }
    },
    [locale, token, currentWorkspace, irminAlert]
  );

  /**
   * Fetch the schema for a list of tables, for example a repository
   *
   * @param tables - List of tables to fetch the schema for
   */
  const fetchSchemaForTables = useCallback(
    async (tables: string[]) => {
      if (!tables || tables.length === 0) return;
      setLoadingSchema(true);
      try {
        // Fetch data action results
        const response = await fetchSchema({
          locale,
          token: token ?? '',
          workspace: currentWorkspace?.slug ?? '',
          tables: tables,
        });
        setSchemaResults(response);
      } catch (error) {
        console.error('DataContext fetchRepositorySchema error', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to fetch schema results'
        );
      } finally {
        setLoadingSchema(false);
      }
    },
    [locale, token, currentWorkspace, irminAlert]
  );

  return (
    <DataContext.Provider
      value={{
        loadingData,
        dataResults,
        loadingSchema,
        schemaResults,
        fetchSchemaForTables,
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
