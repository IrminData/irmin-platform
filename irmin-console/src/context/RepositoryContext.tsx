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

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import IrminCore from '@/services/core/IrminCore';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { constructBaseUrl } from '@/utils/constructBaseUrl';
import { createQueryString } from '@/utils/queryParams';
import { sortCommits } from '@/utils/sortCommits';

import { Branch } from '@/types/core/Branch';
import { Collection, RepositorySchema } from '@/types/core/Collection';
import { Commit } from '@/types/core/Commit';
import { Diff } from '@/types/core/Diff';
import { IrminAPIUnstructuredResponse } from '@/types/core/IrminAPIResponse';
import { Repository } from '@/types/core/Repository';
import { Tag } from '@/types/core/Tag';

import { useWorkspace } from './workspace';

/**
 * Repository context properties
 */
interface RepositoryContextProps {
  // Active repository context state
  currentRepository: Repository;
  immutable: boolean;
  currentRef?: string;
  updateCurrentRef: (ref?: string, disableRedirect?: boolean) => string;
  viewRef: (ref: string) => void;
  defaultRef?: string;
  setDefaultRef: (ref: string) => void;
  // Collections
  loadingCollections: boolean;
  collections: Collection[];
  fetchCollections?: (repository: string, ref?: string) => Promise<void>;
  // Schema
  loadingSchema: boolean;
  schema: RepositorySchema | null;
  fetchSchema: (collections: string[]) => Promise<void>;
  // Branches
  loadingBranches: boolean;
  branches: Branch[] | null;
  fetchBranches: () => Promise<void>;
  deleteBranch: (branch: string) => Promise<void>;
  createBranch: (name: string, from: string) => Promise<void>;
  // Tags
  loadingTags: boolean;
  tags: Tag[] | null;
  fetchTags: () => Promise<void>;
  deleteTag: (tag: string) => Promise<void>;
  createTag: (name: string, ref: string) => Promise<void>;
  // Commits
  loadingCommits: boolean;
  commits: Commit[] | null;
  fetchCommits: () => Promise<void>;
  fetchCommitsForRef: (ref: string) => Promise<Commit[] | null>;
  commitChanges: (message: string) => Promise<boolean>;
  revertChanges: () => Promise<boolean>;
  fetchLastModification: (collection: string) => Promise<Commit | null>;
  // Diff
  fetchDiff: (base: string, compare: string) => Promise<Diff | null>;
  fetchDiffContent: (
    collection: string,
    base: string,
    compare: string
  ) => Promise<{
    base: IrminAPIUnstructuredResponse;
    compare: IrminAPIUnstructuredResponse;
  } | null>;
  mergeRefs: (
    base: string,
    compare: string,
    description: string,
    strategy: string
  ) => Promise<boolean>;
}

const RepositoryContext = createContext<RepositoryContextProps | undefined>(
  undefined
);

/**
 * Repository context for state management and interactions with the repository, branches, commits, and collections.
 *
 * @param config - Repository context provider configuration
 * @param config.children - Child components
 * @param config.repositorySlug - (optional) Initial active repository to set
 * @param config.initialRef - (optional) Initial active ref to set (eg. branch, commit, tag)
 *
 * @returns Repository context provider
 */
export const RepositoryProvider = ({
  children,
  repositorySlug,
  initialRef,
}: {
  children: React.ReactNode;
  repositorySlug?: string;
  initialRef?: string;
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { irminAlert } = usePopup();
  const { locale } = useLocale();
  const {
    diffService,
    branchService,
    tagService,
    commitService,
    schemaService,
    collectionService,
  } = useMemo(() => new IrminCore(locale), [locale]);

  const {
    repositories: { repositories },
  } = useWorkspace();

  // Active Repository for the context
  const currentRepository = useMemo(
    () => repositories.find((item) => item.slug === repositorySlug),
    [repositories, repositorySlug]
  );

  // Initial ref to default to
  const [defaultRef, setDefaultRef] = useState<string | undefined>(
    initialRef ?? currentRepository?.default_branch
  );

  // Active repository context ref (eg. branch, commit, tag)
  const [currentRef, setCurrentRef] = useState<string | undefined>(undefined);

  /**
   * Hook to update the current ref
   *
   * Updates the current ref and the query parameter ?ref=
   *
   * @param ref - The new ref to set. If not provided, the initial ref is set
   * @returns The updated pathname with the new ref
   */
  const updateCurrentRef = useCallback(
    (ref?: string, disableRedirect?: boolean): string => {
      const newRef = ref ?? defaultRef ?? '';
      const newPath =
        pathname +
        '?' +
        createQueryString('ref', newRef, searchParams.toString());

      setCurrentRef(ref ?? defaultRef);

      if (!disableRedirect) router.push(newPath);

      return newPath;
    },
    [pathname, router, searchParams, defaultRef]
  );

  /**
   * View the repository at a specific ref
   * Navigate to the repository page and change the current ref to the selected ref
   *
   * @param ref - The ref to view
   */
  const viewRef = useCallback(
    (ref: string) => {
      // Update the current ref and get the new path
      const newPath = updateCurrentRef(ref, true);
      // Construct the base URL for the repository page
      const baseUrl = constructBaseUrl({
        pathname: newPath,
        segment: 'repositories',
        includeSegment: true,
        segmentsAfter: 1,
        keepQueryParams: true,
      });
      // Redirect to the repository page
      router.replace(baseUrl);
    },
    [updateCurrentRef, router]
  );

  // Collections state
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);

  // Schema state
  const [loadingSchema, setLoadingSchema] = useState<boolean>(false);
  const [schema, setSchema] = useState<RepositorySchema | null>(null);

  // Branches state
  const [loadingBranches, setLoadingBranches] = useState<boolean>(false);
  const [branches, setBranches] = useState<Branch[] | null>(null);

  // Tags state
  const [loadingTags, setLoadingTags] = useState<boolean>(false);
  const [tags, setTags] = useState<Tag[] | null>(null);

  // Commits state
  const [loadingCommits, setLoadingCommits] = useState<boolean>(false);
  const [commits, setCommits] = useState<Commit[] | null>(null);

  /**
   * Fetch the currennt collections
   */
  const fetchCollections = useCallback(async () => {
    setLoadingCollections(true);
    try {
      const res = await collectionService.fetchCollections(
        repositorySlug ?? '',
        currentRef
      );
      setCollections(res.data);
    } catch (error) {
      console.error('RepositoryContext fetchCollections error', error);
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Failed to fetch collections'
      );
    } finally {
      setLoadingCollections(false);
    }
  }, [collectionService, irminAlert, repositorySlug, currentRef]);

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
      console.error('RepositoryContext fetchSchema error', error);
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Failed to fetch schema'
      );
    } finally {
      setLoadingSchema(false);
    }
  }, [currentRef, schemaService, collections, irminAlert]);

  /**
   * Fetch the branches and default branch for the current repository
   */
  const fetchBranches = useCallback(async () => {
    setLoadingBranches(true);
    try {
      // Fetch the branches
      const res = await branchService.fetchBranches(repositorySlug ?? '');
      // Set the branches
      setBranches(res.data);
    } catch (error) {
      console.error('RepositoryContext fetchBranches error', error);
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Failed to fetch branches'
      );
    } finally {
      setLoadingBranches(false);
    }
  }, [repositorySlug, branchService, irminAlert]);

  /**
   * Fetch the tags for the current repository
   */
  const fetchTags = useCallback(async () => {
    setLoadingTags(true);
    try {
      // Fetch and set the tags
      const res = await tagService.fetchTags(repositorySlug ?? '');
      setTags(res.data);
    } catch (error) {
      console.error('RepositoryContext fetchTags error', error);
      irminAlert('error', (error as Error)?.message ?? 'Failed to fetch tags');
    } finally {
      setLoadingTags(false);
    }
  }, [repositorySlug, tagService, irminAlert]);

  /**
   * Fetch the current commits
   */
  const fetchCommits = useCallback(async () => {
    setLoadingCommits(true);
    try {
      if (!repositorySlug) return;
      const res = await commitService.fetchCommits(repositorySlug, currentRef);
      // Sort the commits by hash
      const sortedCommits = sortCommits(res.data ?? []);
      setCommits(sortedCommits);
    } catch (error) {
      console.error('RepositoryContext fetchCommits error', error);
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Failed to fetch commits'
      );
    } finally {
      setLoadingCommits(false);
    }
  }, [repositorySlug, currentRef, commitService, irminAlert]);

  /**
   * Hook to fetch a sorted list of commits for a specific ref
   */
  const fetchCommitsForRef = useCallback(
    async (ref: string) => {
      try {
        if (!repositorySlug) return null;
        const res = await commitService.fetchCommits(repositorySlug, ref);
        // Sort the commits by hash
        const sortedCommits = sortCommits(res.data ?? []);
        return sortedCommits;
      } catch (error) {
        console.error('RepositoryContext fetchCommitsForRef error', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to fetch commits for ref'
        );
      }
      return null;
    },
    [repositorySlug, commitService, irminAlert]
  );

  /**
   * Hook to fetch the diff between two refs (eg. branches, commits)
   *
   * @param base - The base ref to compare
   * @param compare - The ref to compare with the base
   * @returns Diff - The diff between the two refs, null if failed
   */
  const fetchDiff = useCallback(
    async (base: string, compare: string): Promise<Diff | null> => {
      try {
        if (!repositorySlug) return null;
        const res = await diffService.compareRefs(
          repositorySlug,
          base,
          compare
        );
        return res.data;
      } catch (error) {
        console.error(error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to fetch diff for refs'
        );
      }
      return null;
    },
    [repositorySlug, diffService, irminAlert]
  );

  /**
   * Hook to fetch the content of the diff for a specific collection
   */
  const fetchDiffContent = useCallback(
    async (
      collection: string,
      base: string,
      compare: string
    ): Promise<{
      base: IrminAPIUnstructuredResponse;
      compare: IrminAPIUnstructuredResponse;
    } | null> => {
      try {
        const [baseContent, compareContent] = await Promise.all([
          collectionService.fetchContent({
            collection: collection,
            repository: repositorySlug,
            ref: base,
          }),
          collectionService.fetchContent({
            collection: collection,
            repository: repositorySlug,
            ref: compare,
          }),
        ]);
        return {
          base: baseContent,
          compare: compareContent,
        };
      } catch (error) {
        console.error('RepositoryContext fetchDiffContent error', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to fetch diff content'
        );
      }
      return null;
    },
    [collectionService, repositorySlug, irminAlert]
  );

  /**
   * Hook to commit the uncommitted changes
   *
   * @param message - The commit message
   * @returns boolean - True if the commit was successful, false otherwise
   */
  const commitChanges = useCallback(
    async (message: string): Promise<boolean> => {
      try {
        if (!repositorySlug || !currentRef) return false;
        const res = await commitService.createCommit(
          repositorySlug,
          currentRef,
          message
        );
        fetchCommits();
        irminAlert('success', res.message ?? 'Changes committed');
        return true;
      } catch (error) {
        console.error('RepositoryContext commitChanges error', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to commit changes'
        );
      }
      return false;
    },
    [repositorySlug, currentRef, commitService, fetchCommits, irminAlert]
  );

  /**
   * Hook to fetch the last commit which modified a collection
   *
   * @param collection - The collection to fetch the last commit for
   * @returns Commit - The last commit which modified the collection
   */
  const fetchLastModification = useCallback(
    async (collection: string): Promise<Commit | null> => {
      try {
        if (!repositorySlug || !currentRef) return null;
        const res = await commitService.fetchLastModification(
          repositorySlug,
          currentRef,
          collection
        );
        return res.data;
      } catch (error) {
        console.error('RepositoryContext fetchLastModification error', error);
        irminAlert(
          'error',
          (error as Error)?.message ??
            'Failed to fetch last commit for collection'
        );
      }
      return null;
    },
    [repositorySlug, commitService, currentRef, irminAlert]
  );

  /**
   * Hook to revert the uncommitted changes on the current branch
   *
   * @returns boolean - True if the revert was successful, false otherwise
   */
  const revertChanges = useCallback(async (): Promise<boolean> => {
    try {
      if (!repositorySlug || !currentRef) return false;
      const res = await commitService.revertUncommittedChanges(
        repositorySlug,
        currentRef
      );
      irminAlert('success', res.message ?? 'Changes reverted');
      return true;
    } catch (error) {
      console.error('RepositoryContext revertChanges error', error);
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Failed to revert changes'
      );
    }
    return false;
  }, [repositorySlug, currentRef, commitService, irminAlert]);

  /**
   * Hook to merge one ref into another
   *
   * @param base - The base ref to merge into
   * @param compare - The ref to merge into the base
   * @param description - The merge commit message
   * @param strategy - The merge strategy (default, source-wins, dest-wins)
   * @returns boolean - True if the merge was successful, false otherwise
   */
  const mergeRefs = useCallback(
    async (
      base: string,
      compare: string,
      description: string,
      strategy: string
    ): Promise<boolean> => {
      try {
        if (!repositorySlug) return false;
        const res = await diffService.mergeRefs(
          repositorySlug,
          base,
          compare,
          description,
          strategy
        );
        irminAlert('success', res.message ?? 'Successfully merged');
        return true;
      } catch (error) {
        console.error('RepositoryContext mergeRefs error', error);
        irminAlert('error', (error as Error)?.message ?? 'Merge failed');
      }
      return false;
    },
    [repositorySlug, diffService, irminAlert]
  );

  /**
   * Hook to delete a branch from the repository.
   *
   * @param branch - The branch name to delete
   */
  const deleteBranch = useCallback(
    async (branch: string) => {
      try {
        // Delete the branch
        const res = await branchService.deleteBranch(
          branch,
          repositorySlug ?? ''
        );
        irminAlert('success', res.message ?? 'Branch deleted successfully');
        // Refetch the branches
        fetchBranches();
      } catch (error) {
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to delete branch'
        );
      }
    },
    [repositorySlug, fetchBranches, irminAlert, branchService]
  );

  /**
   * Hook to create a branch in the repository.
   *
   * @param name - The name of the new branch
   * @param from - The branch to create the new branch from
   */
  const createBranch = useCallback(
    async (name: string, from: string) => {
      try {
        // Create the branch
        const res = await branchService.createBranch(
          name,
          from,
          repositorySlug ?? ''
        );
        irminAlert('success', res.message ?? 'Branch created successfully');
        // Refetch the branches
        fetchBranches();
      } catch (error) {
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to create branch'
        );
      }
    },
    [repositorySlug, fetchBranches, irminAlert, branchService]
  );

  /**
   * Hook to delete a tag from the repository.
   *
   * @param tag - The tag name to delete
   */
  const deleteTag = useCallback(
    async (tag: string) => {
      try {
        // Delete the tag
        const res = await tagService.deleteTag(tag, repositorySlug ?? '');
        irminAlert('success', res.message ?? 'Tag deleted successfully');
        // Refetch the tags
        fetchTags();
      } catch (error) {
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to delete tag'
        );
      }
    },
    [repositorySlug, fetchTags, irminAlert, tagService]
  );

  /**
   * Hook to create a tag in the repository.
   *
   * @param name - The name of the new tag
   * @param ref - The ref to create the new tag from
   */
  const createTag = useCallback(
    async (name: string, ref: string) => {
      try {
        // Create the tag
        const res = await tagService.createTag(name, ref, repositorySlug ?? '');
        irminAlert('success', res.message ?? 'Tag created successfully');
        // Refetch the tags
        fetchTags();
      } catch (error) {
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to create tag'
        );
      }
    },
    [repositorySlug, fetchTags, irminAlert, tagService]
  );

  // Track the fetch for the initial values
  const initialFetchFor = useRef<string | null>(null);
  const refFetchFor = useRef<string | null>(null);

  /**
   * Fetch the collections, branches and tags when the repository changes
   *
   * Only fetch if the repository is set
   */
  useEffect(() => {
    if (!repositorySlug) return;
    // Don't fetch if already fetched for the current repository and ref
    if (initialFetchFor.current === repositorySlug) return;
    initialFetchFor.current = repositorySlug;
    // Fetch the collections, branches and tags
    fetchCollections();
    fetchBranches();
    fetchTags();
  }, [repositorySlug, currentRef, fetchCollections, fetchBranches, fetchTags]);

  /**
   * Fetch the schema and commits on initial load, after the collections
   * and branches are loaded, and the current ref is set.
   */
  useEffect(() => {
    if (!collections || !branches || !currentRef) return;
    // Don't fetch schema if already fetched for the current repository and ref
    const fetchFor = `${repositorySlug}-${currentRef}`;
    if (refFetchFor.current === fetchFor) return;
    refFetchFor.current = fetchFor;
    // Fetch the schema and commits
    fetchSchema();
    fetchCommits();
  }, [
    collections,
    branches,
    repositorySlug,
    currentRef,
    fetchSchema,
    fetchCommits,
  ]);

  /**
   * Update current ref if not set
   */
  useEffect(() => {
    const queryRef = searchParams.get('ref');
    if (!currentRef) {
      // Uset the ref from the query parameter if set
      // Otherwise, use the default ref
      if (queryRef) updateCurrentRef(queryRef);
      else if (defaultRef) updateCurrentRef(defaultRef);
    }
  }, [searchParams, currentRef, defaultRef, updateCurrentRef]);

  /**
   * Whether the currently active repository and it's ref can be modified in any way
   */
  const immutable = useMemo(() => {
    // If context data not set, return false
    if (!currentRef || !currentRepository || !branches) return true;
    // Check if the repository as a whole is immutable
    if (currentRepository?.is_immutable) return true;
    // If current ref is not a branch, return false
    const branch = branches.find((b) => b.name === currentRef);
    if (!branch) return true;
    // Check if the branch is immutable
    return branch.is_immutable;
  }, [branches, currentRepository, currentRef]);

  // Return nothing until the repository is set
  if (!currentRepository) return <></>;

  return (
    <RepositoryContext.Provider
      value={{
        // Active repository context state
        currentRepository,
        immutable,
        currentRef,
        updateCurrentRef,
        viewRef,
        defaultRef,
        setDefaultRef,
        // Collections
        loadingCollections,
        collections,
        fetchCollections,
        // Schema
        loadingSchema,
        schema,
        fetchSchema,
        // Branches
        loadingBranches,
        branches,
        fetchBranches,
        deleteBranch,
        createBranch,
        // Tags
        loadingTags,
        tags,
        fetchTags,
        deleteTag,
        createTag,
        // Commits
        loadingCommits,
        commits,
        fetchCommits,
        fetchCommitsForRef,
        commitChanges,
        revertChanges,
        fetchLastModification,
        // Diff
        fetchDiff,
        fetchDiffContent,
        mergeRefs,
      }}
    >
      {children}
    </RepositoryContext.Provider>
  );
};

/**
 * Hook to use the repository context
 */
export const useRepository = (): RepositoryContextProps => {
  const context = useContext(RepositoryContext);
  if (!context) {
    throw new Error('useRepository must be used within a RepositoryProvider');
  }
  return context;
};
