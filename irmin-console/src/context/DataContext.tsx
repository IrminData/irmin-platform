'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import {
  ActionSingleRunRequest,
  ActionSingleRunResult,
} from '@/app/api/action-single-run/types';
import { BranchesResponse } from '@/app/api/branches/types';
import { CommitsResponse } from '@/app/api/commits/types';
import { SchemaResponse } from '@/app/api/schema/types';
import {
  fetchBranchesService,
  fetchCommitsService,
  fetchSchemaService,
  fetchSingleService,
} from '@/services/data';

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
  // Active data context state
  currentRepository: string | null;
  setCurrentRepository: (repository: string | null) => void;
  currentBranch: string | null;
  setCurrentBranch: (branch: string | null) => void;
  // Data state
  loadingData: boolean;
  dataResults: ActionSingleRunResult | null;
  fetchActionSingleResults: (request: ActionSingleRunRequest) => Promise<void>;
  // Data schema state
  loadingSchema: boolean;
  schemaResults: SchemaResponse | null;
  fetchSchema: (collections: string[]) => Promise<void>;
  // Branches state
  loadingBranches: boolean;
  branchesResults: BranchesResponse | null;
  fetchBranches: (repository: string) => Promise<void>;
  // Commits state
  loadingCommits: boolean;
  commitsResults: CommitsResponse | null;
  fetchCommits: (repository: string, branch: string) => Promise<void>;
}

const DataContext = createContext<DataContextProps | undefined>(undefined);

/**
 * Data context to provide data lakehouse interaction functionality.
 *
 * Will fetch data, schema, branches and commits for the active repository and branch.
 * Provides the ability to set the active repository and branch.
 * Provides function to fetch data using single action run.
 *
 * @param config - Data context provider configuration
 * @param config.children - Child components
 * @param config.initialRepository - Initial active repository to set
 * @param config.initialBranch - Initial active branch to set
 *
 * @returns Data context provider
 */
export const DataProvider = ({
  children,
  initialRepository,
  initialBranch,
}: {
  children: React.ReactNode;
  initialRepository: string | null;
  initialBranch: string | null;
}) => {
  const { irminAlert } = usePopup();
  const { token } = useIAM();
  const { locale } = useLocale();
  const {
    workspaces: { currentWorkspace },
  } = useWorkspace();

  // Active data context props
  const [currentRepository, setCurrentRepository] = useState<string | null>(
    initialRepository
  );
  const [currentBranch, setCurrentBranch] = useState<string | null>(
    initialBranch
  );

  // Data state
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [dataResults, setDataResults] = useState<ActionSingleRunResult | null>(
    null
  );

  // Schema state
  const [loadingSchema, setLoadingSchema] = useState<boolean>(false);
  const [schemaResults, setSchemaResults] = useState<SchemaResponse | null>(
    null
  );

  // Branches state
  const [loadingBranches, setLoadingBranches] = useState<boolean>(false);
  const [branchesResults, setBranchesResults] =
    useState<BranchesResponse | null>(null);

  // Commits state
  const [loadingCommits, setLoadingCommits] = useState<boolean>(false);
  const [commitsResults, setCommitsResults] = useState<CommitsResponse | null>(
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
        const response = await fetchSingleService({
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
   * Fetch the schema for a list of collections, for example a repository
   *
   * @param collections - List of collections to fetch the schema for
   */
  const fetchSchema = useCallback(
    async (collections: string[]) => {
      if (!collections || collections.length === 0) return;
      setLoadingSchema(true);
      try {
        // Fetch data action results
        const response = await fetchSchemaService({
          locale,
          token: token ?? '',
          workspace: currentWorkspace?.slug ?? '',
          collections: collections,
        });
        setSchemaResults(response);
      } catch (error) {
        console.error('DataContext fetchSchema error', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to fetch schema'
        );
      } finally {
        setLoadingSchema(false);
      }
    },
    [locale, token, currentWorkspace, irminAlert]
  );

  /**
   * Fetch branches for the current workspace and repository
   *
   * @param repository - The repository to fetch branches for
   */
  const fetchBranches = useCallback(
    async (repository: string) => {
      if (!repository) return;
      setLoadingBranches(true);
      try {
        // Fetch data action results
        const response = await fetchBranchesService({
          locale,
          token: token ?? '',
          workspace: currentWorkspace?.slug ?? '',
          repository: repository,
        });
        setBranchesResults(response);
      } catch (error) {
        console.error('DataContext fetchBranches error', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to fetch branches'
        );
      } finally {
        setLoadingBranches(false);
      }
    },
    [locale, token, currentWorkspace, irminAlert]
  );

  /**
   * Fetch commits for the current workspace, repository and branch
   *
   * @param repository - The repository to fetch branches for
   * @param branch - The branch to fetch commits for
   */
  const fetchCommits = useCallback(
    async (repository: string, branch: string) => {
      if (!repository || !branch) return;
      setLoadingCommits(true);
      try {
        // Fetch data action results
        const response = await fetchCommitsService({
          locale,
          token: token ?? '',
          workspace: currentWorkspace?.slug ?? '',
          repository: repository,
          branch: branch,
        });
        setCommitsResults(response);
      } catch (error) {
        console.error('DataContext fetchCommits error', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to fetch commits'
        );
      } finally {
        setLoadingCommits(false);
      }
    },
    [locale, token, currentWorkspace, irminAlert]
  );

  /**
   * Hook to fetch schema, branches and commits for the current repository and branch when they change
   */
  useEffect(() => {
    if (currentRepository) {
      fetchSchema([currentRepository]);
      fetchBranches(currentRepository);
      if (currentBranch) {
        fetchCommits(currentRepository, currentBranch);
      }
    }
  }, [
    currentRepository,
    currentBranch,
    fetchSchema,
    fetchBranches,
    fetchCommits,
  ]);

  return (
    <DataContext.Provider
      value={{
        // Active data context state
        currentRepository,
        setCurrentRepository,
        currentBranch,
        setCurrentBranch,
        // Data state
        loadingData,
        dataResults,
        fetchActionSingleResults,
        // Schema state
        loadingSchema,
        schemaResults,
        fetchSchema,
        // Branches state
        loadingBranches,
        branchesResults,
        fetchBranches,
        // Commits state
        loadingCommits,
        commitsResults,
        fetchCommits,
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
