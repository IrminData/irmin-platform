'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import IrminCore from '@/services/core/IrminCore';
import { QueryExecutionResultAPIResponse } from '@/services/core/resources/QueryService';

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
  currentRepository?: string;
  currentRef?: string;
  setCurrentRef: (ref?: string) => void;
  // Collection state
  loadingCollections: boolean;
  collections: Collection[];
  fetchCollections?: (repository: string, ref?: string) => Promise<void>;
  // Data state
  runningScript: boolean;
  scriptResult: QueryExecutionResultAPIResponse | null;
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
 * @param config.currentRepository - (optional) Initial active repository to set
 * @param config.initialRef - (optional) Initial active ref to set (eg. branch, commit, tag)
 *
 * @returns Data context provider
 */
export const DataProvider = ({
  children,
  currentRepository,
  initialRef,
}: {
  children: React.ReactNode;
  currentRepository?: string;
  initialRef?: string;
}) => {
  const { irminAlert } = usePopup();
  const { locale } = useLocale();
  const {
    branchService,
    commitService,
    schemaService,
    queryService,
    collectionService,
  } = useMemo(() => new IrminCore(locale), [locale]);

  // Active data context ref (eg. branch, commit, tag)
  const [currentRef, setCurrentRef] = useState<string | undefined>(initialRef);

  // Collections state
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);

  // Data state
  const [runningScript, setRunningScript] = useState<boolean>(false);
  const [scriptResult, setScriptResult] =
    useState<QueryExecutionResultAPIResponse | null>(null);

  // Schema state
  const [loadingSchema, setLoadingSchema] = useState<boolean>(false);
  const [schema, setSchema] = useState<RepositorySchema | null>(null);

  // Branches state
  const [loadingBranches, setLoadingBranches] = useState<boolean>(false);
  const [branches, setBranches] = useState<Branch[] | null>(null);

  // Commits state
  const [loadingCommits, setLoadingCommits] = useState<boolean>(false);
  const [commits, setCommits] = useState<Commit[] | null>(null);

  // Default branch of the current repository
  const defaultBranch = useMemo(() => {
    return branches?.filter((branch) => branch.default)[0]?.name;
  }, [branches]);

  /**
   * Fetch the currennt collections
   */
  const fetchCollections = useCallback(async () => {
    setLoadingCollections(true);
    try {
      const res = await collectionService.fetchCollections(
        currentRepository ?? '',
        currentRef
      );
      setCollections(res.data);
    } catch (error) {
      console.error('DataContext fetchCollections error', error);
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Failed to fetch collections'
      );
    } finally {
      setLoadingCollections(false);
    }
  }, [collectionService, irminAlert, currentRepository, currentRef]);

  /**
   * Fetch the schema
   */
  const fetchSchema = useCallback(async () => {
    setLoadingSchema(true);
    try {
      const res = await schemaService.fetchSchema(
        collections.map((collection) => collection.formatted_name),
        currentRef
      );
      setSchema(res.data);
    } catch (error) {
      console.error('DataContext fetchSchema error', error);
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Failed to fetch schema'
      );
    } finally {
      setLoadingSchema(false);
    }
  }, [currentRef, schemaService, collections, irminAlert]);

  /**
   * Fetch the current branches
   */
  const fetchBranches = useCallback(async () => {
    setLoadingBranches(true);
    try {
      if (!currentRepository) return;
      const res = await branchService.fetchBranches(currentRepository);
      setBranches(res.data);
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
      const res = await commitService.fetchCommits(
        currentRepository,
        currentRef
      );
      setCommits(res.data);
    } catch (error) {
      console.error('DataContext fetchCommits error', error);
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Failed to fetch commits'
      );
    } finally {
      setLoadingCommits(false);
    }
  }, [currentRepository, currentRef, commitService, irminAlert]);

  /**
   * Execute a script
   *
   * The script can be either Irmin SQL query or a script to be executed in the Action Wrapper.
   */
  const runScript = useCallback(
    async (type: IrminFileType, content: string, collection?: Collection) => {
      setRunningScript(true);
      try {
        const res = await queryService.executeScript(
          type,
          content,
          collection?.type
        );
        setScriptResult(res);
      } catch (error) {
        console.error('DataContext executeScript error', error);
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

  // Track the fetch for the initial values
  const initialFetchFor = useRef<string | null>(null);
  const schemaFetchFor = useRef<string | null>(null);

  /**
   * Fetch the collections, branches and commits when the repository or ref changes
   */
  useEffect(() => {
    // Don't fetch if repository is not set
    if (!currentRepository) return;
    // Don't fetch if already fetched for the current repository and ref
    const fetchFor = `${currentRepository}-${currentRef}`;
    if (initialFetchFor.current === fetchFor) return;
    initialFetchFor.current = fetchFor;
    fetchCollections();
    fetchBranches();
    fetchCommits();
  }, [
    currentRepository,
    currentRef,
    fetchCollections,
    fetchBranches,
    fetchCommits,
  ]);

  /**
   * Fetch the schema, branches and commits on initial load
   */
  useEffect(() => {
    // Don't fetch schema if collections are loading or empty
    if (loadingCollections || collections.length === 0) return;
    // Don't fetch schema if already fetched for the current repository and ref
    const fetchFor = `${currentRepository}-${currentRef}`;
    if (schemaFetchFor.current === fetchFor) return;
    schemaFetchFor.current = fetchFor;
    // Fetch the schema
    fetchSchema();
  }, [
    loadingCollections,
    collections,
    currentRepository,
    currentRef,
    fetchSchema,
  ]);

  /**
   * Set the current ref to the default branch if non is set
   */
  useEffect(() => {
    if (!currentRef) {
      setCurrentRef(defaultBranch);
    }
  }, [currentRef, defaultBranch, setCurrentRef]);

  return (
    <DataContext.Provider
      value={{
        // Active data context state
        currentRepository,
        currentRef,
        setCurrentRef,
        // Collection state
        loadingCollections,
        collections,
        fetchCollections,
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
