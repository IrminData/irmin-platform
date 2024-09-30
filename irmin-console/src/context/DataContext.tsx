'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import IrminCore from '@/services/core/IrminCore';
import { QueryAPIResponse } from '@/services/core/resources/QueryService';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/workspace';

import { Branch } from '@/types/core/Branch';
import { IrminFileType } from '@/types/core/Bucket';
import { Collection, RepositorySchema } from '@/types/core/Collection';
import { Commit } from '@/types/core/Commit';

/**
 * Data context properties
 */
interface DataContextProps {
  // Active data context state
  currentRepository?: string;
  setCurrentRepository: (repository?: string) => void;
  currentBranch?: string;
  setCurrentBranch: (branch?: string) => void;
  currentRef?: string;
  setCurrentRef: (ref?: string) => void;
  // Data state
  runningScript: boolean;
  scriptResult: QueryAPIResponse | null;
  runScript: (
    type: IrminFileType,
    content: string,
    collection?: Collection
  ) => Promise<void>;
  // Data schema state
  loadingSchema: boolean;
  schema: RepositorySchema | null;
  fetchSchema: (collections: string[]) => Promise<void>;
  // Branches state
  loadingBranches: boolean;
  branches: Branch[] | null;
  defaultBranch: string | undefined;
  fetchBranches: () => Promise<void>;
  // Commits state
  loadingCommits: boolean;
  commits: Commit[] | null;
  fetchCommits: () => Promise<void>;
  // Download repository
  downloadRepository: (
    path?: string,
    redirectToSuccess?: string,
    redirectToFailed?: string
  ) => Promise<void>;
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
 * @param config.initialRepository - (optional) Initial active repository to set
 * @param config.initialBranch - (optional) Initial active branch to set
 * @param config.initialRef - (optional) Initial active ref to set (eg. commit, tag)
 *
 * @returns Data context provider
 */
export const DataProvider = ({
  children,
  initialRepository,
  initialBranch,
  initialRef,
}: {
  children: React.ReactNode;
  initialRepository?: string;
  initialBranch?: string;
  initialRef?: string;
}) => {
  const { irminAlert } = usePopup();
  const { locale } = useLocale();
  const {
    repositories: { repositories },
  } = useWorkspace();
  const {
    branchService,
    commitService,
    schemaService,
    queryService,
    repositoryService,
  } = useMemo(() => new IrminCore(locale), [locale]);

  // Active data context repository
  const [currentRepository, setCurrentRepository] = useState<
    string | undefined
  >(initialRepository);

  // Active data context branch
  const [currentBranch, setCurrentBranch] = useState<string | undefined>(
    initialBranch
  );

  // Active data context ref (eg. commit, tag)
  const [currentRef, setCurrentRef] = useState<string | undefined>(initialRef);

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
   * Fetch the schema for a list of collections
   *
   * @param collections - List of collections to fetch the schema for
   */
  const fetchSchema = useCallback(
    async (collections: string[]) => {
      setLoadingSchema(true);
      try {
        const response = await schemaService.fetchSchema(
          collections,
          currentRepository,
          currentBranch,
          currentRef
        );
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
    [currentRepository, currentBranch, currentRef, schemaService, irminAlert]
  );

  /**
   * Fetch the current branches
   */
  const fetchBranches = useCallback(async () => {
    setLoadingBranches(true);
    try {
      if (!currentRepository) return;
      const response = await branchService.fetchBranches(currentRepository);
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
  }, [currentRepository, branchService, irminAlert]);

  /**
   * Fetch the current commits
   */
  const fetchCommits = useCallback(async () => {
    setLoadingCommits(true);
    try {
      if (!currentRepository) return;
      const response = await commitService.fetchCommits(
        currentRepository,
        currentBranch,
        currentRef
      );
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
  }, [currentRepository, currentBranch, currentRef, commitService, irminAlert]);

  /**
   * Execute a script
   *
   * The script can be either Irmin SQL query or a script to be executed in the Action Wrapper.
   */
  const runScript = useCallback(
    async (type: IrminFileType, content: string, collection?: Collection) => {
      setRunningScript(true);
      try {
        const response = await queryService.runScript(
          type,
          content,
          currentRepository,
          currentBranch,
          currentRef,
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
    [queryService, currentRepository, currentBranch, currentRef, irminAlert]
  );

  /**
   * Download the current repository to the client's local file system
   * @param path - The path within the repository to download
   * @param redirectToSuccess - The URL to redirect the user to after download success
   * @param redirectToFailed - The URL to redirect the user to after download failure
   */
  const downloadRepository = useCallback(
    async (
      path?: string,
      redirectToSuccess?: string,
      redirectToFailed?: string
    ) => {
      try {
        if (!currentRepository) return;

        // Get the URL user should be redirected to after download
        const currentUrl = window?.location?.href ?? '';
        const successRedirectToUrl = redirectToSuccess ?? currentUrl;
        const failedRedirectToUrl = redirectToFailed ?? currentUrl;

        // Get the download link
        const downloadLink = await repositoryService.getDownloadLink(
          currentRepository,
          currentBranch,
          currentRef,
          path,
          successRedirectToUrl,
          failedRedirectToUrl
        );
        // Direct the user to the download link, open in new tab
        window.open(downloadLink, '_blank');
      } catch (error) {
        console.error('DataContext downloadRepository error', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to download repository'
        );
      }
    },
    [
      currentRepository,
      currentBranch,
      currentRef,
      repositoryService,
      irminAlert,
    ]
  );

  // Default branch for the current repository
  const defaultBranch = useMemo(() => {
    return branches?.filter((branch) => branch.default)[0]?.name;
  }, [branches]);

  /**
   * Hook to fetch schema, branches and commits for the current repository and branch when they change
   */
  useEffect(() => {
    const currentRepositoryCollections = repositories
      .filter((repo) => repo.name === currentRepository)
      .flatMap((repo) => repo.collections);
    fetchSchema(currentRepositoryCollections.map((c) => c.formatted_name));
    fetchBranches();
    fetchCommits();
  }, [
    currentRepository,
    repositories,
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
        currentRef,
        setCurrentRef,
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
        defaultBranch,
        fetchBranches,
        // Commits state
        loadingCommits,
        commits,
        fetchCommits,
        // Download repository
        downloadRepository,
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
