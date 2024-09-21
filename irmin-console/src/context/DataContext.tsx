'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import IrminCore from '@/services/core/IrminCore';
import { QueryAPIResponse } from '@/services/core/resources/QueryService';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { Branch } from '@/types/core/Branch';
import { IrminFileType } from '@/types/core/Bucket';
import { Collection, RepositorySchema } from '@/types/core/Collection';
import { Commit } from '@/types/core/Commit';

/**
 * Data context properties
 */
interface DataContextProps {
  // Active data context state
  currentRepository: string | null;
  setCurrentRepository: (repository: string | null) => void;
  currentBranch: string | null;
  setCurrentBranch: (branch: string | null) => void;
  // Data state
  runningScript: boolean;
  scriptResult: QueryAPIResponse | null;
  runScript: (
    type: IrminFileType,
    content: string,
    branch: string,
    collection?: Collection
  ) => Promise<void>;
  // Data schema state
  loadingSchema: boolean;
  schema: RepositorySchema | null;
  fetchSchema: (collections: string[]) => Promise<void>;
  // Branches state
  loadingBranches: boolean;
  branches: Branch[] | null;
  fetchBranches: (repository: string) => Promise<void>;
  // Commits state
  loadingCommits: boolean;
  commits: Commit[] | null;
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

  const { branchService, commitService, schemaService, queryService } = useMemo(
    () => new IrminCore(locale, token ?? ''),
    [locale, token]
  );

  // Active data context props
  const [currentRepository, setCurrentRepository] = useState<string | null>(
    initialRepository
  );
  const [currentBranch, setCurrentBranch] = useState<string | null>(
    initialBranch
  );

  // Data state
  const [runningScript, setRunningScript] = useState<boolean>(false);
  const [scriptResult, setScriptResult] = useState<QueryAPIResponse | null>(
    null
  );

  // Schema state
  const [loadingSchema, setLoadingSchema] = useState<boolean>(false);
  const [schema, setSchema] = useState<RepositorySchema | null>(null);

  // Branches state
  const [loadingBranches, setLoadingBranches] = useState<boolean>(false);
  const [branches, setBranches] = useState<Branch[] | null>(null);

  // Commits state
  const [loadingCommits, setLoadingCommits] = useState<boolean>(false);
  const [commits, setCommits] = useState<Commit[] | null>(null);

  /**
   * Execute a script
   *
   * The script can be either Irmin SQL query or a script to be executed in the Action Wrapper.
   */
  const runScript = useCallback(
    async (
      type: IrminFileType,
      content: string,
      branch: string,
      collection?: Collection
    ) => {
      setRunningScript(true);
      try {
        const response = await queryService.runScript(
          type,
          content,
          branch,
          collection
        );
        setScriptResult(response);
      } catch (error) {
        console.error('DataContext runScript error', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to run script'
        );
      } finally {
        setRunningScript(false);
      }
    },
    [queryService, irminAlert]
  );

  /**
   * Fetch the schema for a list of collections, for example repositories
   *
   * @param collections - List of collections to fetch the schema for
   */
  const fetchSchema = useCallback(
    async (collections: string[]) => {
      setLoadingSchema(true);
      try {
        const response = await schemaService.fetchSchema(collections);
        setSchema(response.data);
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
    [schemaService, irminAlert]
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
        const response = await branchService.fetchBranches(repository);
        setBranches(response.data);
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
    [branchService, irminAlert]
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
        const response = await commitService.fetchCommits(repository, branch);
        setCommits(response.data);
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
    [commitService, irminAlert]
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
        runningScript,
        scriptResult,
        runScript,
        // Schema state
        loadingSchema,
        schema,
        fetchSchema,
        // Branches state
        loadingBranches,
        branches,
        fetchBranches,
        // Commits state
        loadingCommits,
        commits,
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
