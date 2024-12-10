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

import {
  createBranch,
  deleteBranch,
  getBranches,
} from '@/lib/actions/branches';
import {
  createCommit,
  getCommits,
  getLastModification,
  revertUncommittedChanges,
} from '@/lib/actions/commits';
import { getDiff, mergeRefs } from '@/lib/actions/diff';
import {
  deleteObject,
  getObjectContent,
  getObjects,
  getObjectSchema,
  moveObject,
  uploadObject,
} from '@/lib/actions/objects';
import {
  deleteRepository,
  getRepository,
  getRepositoryDownloadLink,
  reassignRepository,
  updateRepository,
} from '@/lib/actions/repositories';
import { createTag, deleteTag, getTags } from '@/lib/actions/tags';
import { Dictionary } from '@/lib/dict';

import { usePopup } from '@/context/PopupContext';

import { constructBaseUrl } from '@/utils/constructBaseUrl';
import { createQueryString } from '@/utils/queryParams';

import { Branch } from '@/types/core/Branch';
import { Commit } from '@/types/core/Commit';
import { Diff, MergeStrategy } from '@/types/core/Diff';
import { IrminAPIBinaryResponse } from '@/types/core/IrminAPIResponse';
import { Object } from '@/types/core/Object';
import { ObjectSchema } from '@/types/core/ObjectSchema';
import { Repository } from '@/types/core/Repository';
import { Tag } from '@/types/core/Tag';
import { ContentType } from '@/types/examples/core/content';
import { ItemUpdateProps } from '@/types/internal/ItemUpdateProps';

/**
 * Repository context props
 */
interface RepositoryContextProps {
  // Active repository state
  currentRepository: Repository;
  immutable: boolean;
  currentRef?: string;
  updateCurrentRef: (ref?: string, disableRedirect?: boolean) => string;
  viewRef: (ref: string) => void;
  defaultRef?: string;
  setDefaultRef: (ref: string) => void;
  currentPath: string;
  updateCurrentPath: (path: string) => void;
  // General repository hooks
  fetchRepository: () => Promise<void>;
  updateRepository: (data: ItemUpdateProps) => Promise<void>;
  deleteRepository: () => Promise<void>;
  reassignRepository: (ownerID: string) => Promise<void>;
  downloadRepository: (selectedPath?: string) => Promise<void>;
  // Objects
  loadingObjects: boolean;
  objects: Object[];
  deleteObject: (objectName: string) => Promise<void>;
  moveObject: (oldPath: string, newPath: string) => Promise<void>;
  createGroup: (name: string, path: string, ref: string) => Promise<void>;
  uploadObject: (
    objectName: string,
    objectPath: string | undefined,
    ref: string | undefined,
    files: FileList
  ) => Promise<void>;
  getObjectContent: (
    objectPath: string,
    raw?: boolean,
    type?: ContentType
  ) => Promise<IrminAPIBinaryResponse | undefined>;
  getObjectSchema: (objectPath: string) => Promise<ObjectSchema | undefined>;
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
  fetchCommits: (ref?: string) => Promise<Commit[] | undefined>;
  commitChanges: (message: string) => Promise<boolean>;
  revertChanges: () => Promise<boolean>;
  fetchLastModification: (objectPath: string) => Promise<Commit | null>;
  // Diff
  fetchDiff: (base: string, compare: string) => Promise<Diff | null>;
  fetchDiffContent: (
    objectPath: string,
    base: string,
    compare: string
  ) => Promise<{
    base: IrminAPIBinaryResponse;
    compare: IrminAPIBinaryResponse;
  } | null>;
  mergeRefs: (
    base: string,
    compare: string,
    description: string,
    strategy: MergeStrategy
  ) => Promise<boolean>;
}

const RepositoryContext = createContext<RepositoryContextProps | undefined>(
  undefined
);

/**
 * Repository context for state management and interactions with the repository, branches, commits and objects
 *
 * @param config - Repository context provider configuration
 * @param config.children - Child components
 * @param config.dict - Dictionary with translations
 * @param config.repositorySlug - Initial active repository to set
 * @param config.initialRef - (optional) Initial active ref to set (eg. branch, commit, tag
 * @param config.initialRepository - Initial repository object to set
 * @param config.initialBranches - Initial branches to set
 * @param config.initialTags - Initial tags to set
 * @param config.initialCommits - Initial commits to set
 *
 * @returns Repository context provider
 */
export const RepositoryProvider = ({
  children,
  dict,
  repositorySlug,
  initialRef,
  initialRepository,
  initialBranches,
  initialTags,
  initialCommits,
}: {
  children: React.ReactNode;
  dict: Dictionary;
  repositorySlug: string;
  initialRef?: string;
  initialRepository: Repository;
  initialBranches: Branch[];
  initialTags: Tag[];
  initialCommits: Commit[];
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { irminAlert, irminConfirm } = usePopup();

  // Active Repository for the context
  const [currentRepository, setRepository] = useState(initialRepository);

  // Initial ref to default to
  const [defaultRef, setDefaultRef] = useState<string | undefined>(
    initialRef ?? currentRepository?.default_branch
  );

  // Active repository context ref (eg. branch, commit, tag)
  const [currentRef, setCurrentRef] = useState<string | undefined>(undefined);

  // Active path in the repository, default to root
  const [currentPath, setCurrentPath] = useState<string>('/');

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

  // Track if the repository is being updated
  const updating = useRef(false);

  // Refetch the current repository
  const fetchRepository = useCallback(async () => {
    try {
      const newRepository = await getRepository(repositorySlug);
      setRepository(newRepository);
    } catch (error) {
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Failed to fetch the repository'
      );
    }
  }, [repositorySlug, irminAlert]);

  // Delete the current repository
  const handleDeleteRepository = useCallback(async () => {
    const confirmed = await irminConfirm(
      'warning',
      `${dict.misc.areYouSureYouWantToDelete} (${currentRepository.name})`
    );
    if (updating.current || !confirmed) return;
    try {
      updating.current = true;
      const res = await deleteRepository(repositorySlug);
      irminAlert('success', res.message ?? 'Repository deleted successfully');
    } catch (error) {
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Error deleting the repository'
      );
    } finally {
      updating.current = false;
    }
  }, [repositorySlug, currentRepository.name, dict, irminAlert, irminConfirm]);

  // Update the current repository
  const handleUpdateRepository = useCallback(
    async (data: ItemUpdateProps) => {
      if (updating.current) return;
      try {
        updating.current = true;
        const res = await updateRepository(repositorySlug, data);
        await fetchRepository();
        irminAlert('success', res.message ?? 'Repository updated successfully');
      } catch (error) {
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Error updating the repository'
        );
      } finally {
        updating.current = false;
      }
    },
    [repositorySlug, fetchRepository, irminAlert]
  );

  // Reassign the current repository
  const handleReassignRepository = useCallback(
    async (ownerID: string) => {
      const confirmed = await irminConfirm(
        'warning',
        `${dict.misc.areYouSureYouWantToReassign} (${currentRepository.name})`
      );
      if (updating.current || !confirmed) return;
      try {
        updating.current = true;
        const res = await reassignRepository(repositorySlug, ownerID);
        await fetchRepository();
        irminAlert(
          'success',
          res.message ?? 'Repository reassigned successfully'
        );
      } catch (error) {
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Error reassigning the repository'
        );
      } finally {
        updating.current = false;
      }
    },
    [
      repositorySlug,
      currentRepository.name,
      dict,
      fetchRepository,
      irminAlert,
      irminConfirm,
    ]
  );

  // Download the current repository
  const handleRpositoryDownload = useCallback(
    async (selectedPath?: string) => {
      try {
        const res = await getRepositoryDownloadLink(
          repositorySlug,
          currentRef ?? 'main',
          selectedPath ?? currentPath
        );
        if (typeof res.data.download_url === 'string') {
          irminAlert(
            'success',
            res.message ?? 'Repository downloaded successfully'
          );
          window.open(res.data.download_url, '_blank');
        } else {
          irminAlert(
            'info',
            res.message ?? 'Download link was not provided by the server'
          );
        }
      } catch (error) {
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Error downloading the repository'
        );
      }
    },
    [repositorySlug, currentRef, currentPath, irminAlert]
  );

  // Objects state
  const [loadingObjects, setLoadingObjects] = useState(false);
  const [objects, setObjects] = useState<Object[]>([]);

  // Branches state
  const [loadingBranches, setLoadingBranches] = useState<boolean>(false);
  const [branches, setBranches] = useState<Branch[]>(initialBranches);

  // Tags state
  const [loadingTags, setLoadingTags] = useState<boolean>(false);
  const [tags, setTags] = useState<Tag[]>(initialTags);

  // Commits state
  const [loadingCommits, setLoadingCommits] = useState<boolean>(false);
  const [commits, setCommits] = useState<Commit[]>(initialCommits);

  /**
   * Fetch the current objects in the repository at the current path and ref
   */
  const fetchObjects = useCallback(async () => {
    setLoadingObjects(true);
    try {
      const newObjects = await getObjects(
        repositorySlug,
        currentPath,
        currentRef
      );
      setObjects(newObjects);
    } catch (error) {
      console.error('RepositoryContext fetchObjects error', error);
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Failed to fetch objects'
      );
    } finally {
      setLoadingObjects(false);
    }
  }, [irminAlert, repositorySlug, currentPath, currentRef]);

  /**
   * Delete an object from the repository at path
   */
  const handleDeleteObject = useCallback(
    async (objectName: string) => {
      try {
        const res = await deleteObject(
          repositorySlug,
          currentRef ?? 'main',
          currentPath,
          objectName
        );
        irminAlert('success', res.message ?? 'Object deleted successfully');
        fetchObjects();
      } catch (error) {
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to delete object'
        );
      }
    },
    [repositorySlug, currentRef, currentPath, fetchObjects, irminAlert]
  );

  /**
   * Move an object in the repository to a new path
   */
  const handleMoveObject = useCallback(
    async (currentObjectPath: string, newObjectPath: string) => {
      try {
        const res = await moveObject(
          repositorySlug,
          currentRef ?? 'main',
          currentObjectPath,
          newObjectPath
        );
        irminAlert('success', res.message ?? 'Object moved successfully');
        fetchObjects();
      } catch (error) {
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to move object'
        );
      }
    },
    [repositorySlug, currentRef, fetchObjects, irminAlert]
  );

  /**
   * Create a group (e.g. directory) in the repository at path
   */
  const handleCreateGroup = useCallback(
    async (name: string, path: string, ref: string) => {
      try {
        const res = await uploadObject(repositorySlug, ref, path, name);
        irminAlert('success', res.message ?? 'Group created successfully');
        fetchObjects();
      } catch (error) {
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to create directory'
        );
      }
    },
    [repositorySlug, fetchObjects, irminAlert]
  );

  /**
   * Upload an object to the repository at path
   */
  const handleUploadObject = useCallback(
    async (
      objectName: string,
      objectPath: string | undefined,
      ref: string | undefined,
      files: FileList
    ) => {
      try {
        const res = await uploadObject(
          repositorySlug,
          ref ?? currentRef ?? 'main',
          objectPath ?? currentPath ?? '/',
          objectName,
          files
        );
        irminAlert('success', res.message ?? 'Object uploaded successfully');
        fetchObjects();
      } catch (error) {
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to upload object'
        );
      }
    },
    [repositorySlug, currentRef, currentPath, fetchObjects, irminAlert]
  );

  /**
   * Fetch the content of the object at path
   */
  const fetchObjectContent = useCallback(
    async (path: string, raw?: boolean, type?: ContentType) => {
      try {
        const res = await getObjectContent(
          repositorySlug,
          path,
          currentRef,
          raw,
          type
        );
        return res;
      } catch (error) {
        console.error('RepositoryContext fetchObjectContent error', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to fetch object content'
        );
      }
    },
    [repositorySlug, currentRef, irminAlert]
  );

  /**
   * Fetch the schema of the object at path
   */
  const fetchObjectSchema = useCallback(
    async (path: string) => {
      try {
        const res = await getObjectSchema(
          repositorySlug,
          currentRef ?? '',
          path
        );
        return res.data;
      } catch (error) {
        console.error('RepositoryContext fetchObjectSchema error', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to fetch object schema'
        );
      }
    },
    [repositorySlug, currentRef, irminAlert]
  );

  /**
   * Fetch the branches and default branch for the current repository
   */
  const fetchBranches = useCallback(async () => {
    setLoadingBranches(true);
    try {
      // Fetch the branches
      const newBranches = await getBranches(repositorySlug);
      // Set the branches
      setBranches(newBranches);
    } catch (error) {
      console.error('RepositoryContext fetchBranches error', error);
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Failed to fetch branches'
      );
    } finally {
      setLoadingBranches(false);
    }
  }, [repositorySlug, irminAlert]);

  /**
   * Fetch the tags for the current repository
   */
  const fetchTags = useCallback(async () => {
    setLoadingTags(true);
    try {
      // Fetch and set the tags
      const tags = await getTags(repositorySlug);
      setTags(tags);
    } catch (error) {
      console.error('RepositoryContext fetchTags error', error);
      irminAlert('error', (error as Error)?.message ?? 'Failed to fetch tags');
    } finally {
      setLoadingTags(false);
    }
  }, [repositorySlug, irminAlert]);

  /**
   * Fetch the commits for a specific ref or the current ref
   */
  const fetchCommits = useCallback(
    async (ref?: string) => {
      setLoadingCommits(true);
      try {
        const newCommits = await getCommits(repositorySlug, ref ?? currentRef);
        if (!ref) setCommits(newCommits);
        return newCommits;
      } catch (error) {
        console.error('RepositoryContext fetchCommits error', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to fetch commits'
        );
      } finally {
        setLoadingCommits(false);
      }
    },
    [repositorySlug, currentRef, irminAlert]
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
        const res = await getDiff(repositorySlug, base, compare);
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
    [repositorySlug, irminAlert]
  );

  /**
   * Hook to fetch the content of the diff for a specific object
   */
  const fetchDiffContent = useCallback(
    async (
      objectPath: string,
      base: string,
      compare: string
    ): Promise<{
      base: IrminAPIBinaryResponse;
      compare: IrminAPIBinaryResponse;
    } | null> => {
      try {
        const [baseContent, compareContent] = await Promise.all([
          getObjectContent(repositorySlug, objectPath, base),
          getObjectContent(repositorySlug, objectPath, compare),
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
    [repositorySlug, irminAlert]
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
        if (!currentRef) return false;
        const res = await createCommit(repositorySlug, currentRef, message);
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
    [repositorySlug, currentRef, fetchCommits, irminAlert]
  );

  /**
   * Hook to fetch the last commit which modified an object
   *
   * @param objectPath - The path of the object to check
   * @returns Commit - The last commit which modified the object, null if failed
   */
  const fetchLastModification = useCallback(
    async (objectPath: string): Promise<Commit | null> => {
      try {
        if (!currentRef) return null;
        const res = await getLastModification(
          repositorySlug,
          currentRef,
          objectPath
        );
        return res.data;
      } catch (error) {
        console.error('RepositoryContext fetchLastModification error', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to fetch last commit for object'
        );
      }
      return null;
    },
    [repositorySlug, currentRef, irminAlert]
  );

  /**
   * Hook to revert the uncommitted changes on the current branch
   *
   * @returns boolean - True if the revert was successful, false otherwise
   */
  const revertChanges = useCallback(async (): Promise<boolean> => {
    try {
      if (!currentRef) return false;
      const res = await revertUncommittedChanges(repositorySlug, currentRef);
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
  }, [repositorySlug, currentRef, irminAlert]);

  /**
   * Hook to merge one ref into another
   *
   * @param base - The base ref to merge into
   * @param compare - The ref to merge into the base
   * @param description - The merge commit message
   * @param strategy - The merge strategy (default, source-wins, dest-wins)
   * @returns boolean - True if the merge was successful, false otherwise
   */
  const handleMergeRefs = useCallback(
    async (
      base: string,
      compare: string,
      description: string,
      strategy: MergeStrategy
    ): Promise<boolean> => {
      try {
        const res = await mergeRefs(
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
    [repositorySlug, irminAlert]
  );

  /**
   * Hook to delete a branch from the repository.
   *
   * @param branch - The branch name to delete
   */
  const handleDeleteBranch = useCallback(
    async (branch: string) => {
      try {
        // Delete the branch
        const res = await deleteBranch(branch, repositorySlug);
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
    [repositorySlug, fetchBranches, irminAlert]
  );

  /**
   * Hook to create a branch in the repository.
   *
   * @param name - The name of the new branch
   * @param from - The branch to create the new branch from
   */
  const handleCreateBranch = useCallback(
    async (name: string, from: string) => {
      try {
        // Create the branch
        const res = await createBranch(name, from, repositorySlug);
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
    [repositorySlug, fetchBranches, irminAlert]
  );

  /**
   * Hook to delete a tag from the repository.
   *
   * @param tag - The tag ID to delete
   */
  const handleDeleteTag = useCallback(
    async (tag: string) => {
      try {
        // Delete the tag
        const res = await deleteTag(tag, repositorySlug);
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
    [repositorySlug, fetchTags, irminAlert]
  );

  /**
   * Hook to create a tag in the repository.
   *
   * @param name - The name of the new tag
   * @param ref - The ref to create the new tag from
   */
  const handleCreateTag = useCallback(
    async (name: string, ref: string) => {
      try {
        // Create the tag
        const res = await createTag(name, ref, repositorySlug);
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
    [repositorySlug, fetchTags, irminAlert]
  );

  const objectsFetchedFor = useRef<string | undefined>(undefined);

  /**
   * Fetch the repository object at the active path and ref on mount and when the path or ref changes
   */
  useEffect(() => {
    if (!currentPath || !currentRef) return;
    if (objectsFetchedFor.current === `${currentPath}@${currentRef}`) return;
    objectsFetchedFor.current = `${currentPath}@${currentRef}`;
    fetchObjects();
  }, [currentPath, currentRef, fetchObjects]);

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
        currentPath,
        updateCurrentPath: setCurrentPath,
        // General repository hooks
        fetchRepository,
        updateRepository: handleUpdateRepository,
        deleteRepository: handleDeleteRepository,
        reassignRepository: handleReassignRepository,
        downloadRepository: handleRpositoryDownload,
        // Objects
        loadingObjects,
        objects,
        deleteObject: handleDeleteObject,
        moveObject: handleMoveObject,
        createGroup: handleCreateGroup,
        uploadObject: handleUploadObject,
        getObjectContent: fetchObjectContent,
        getObjectSchema: fetchObjectSchema,
        // Branches
        loadingBranches,
        branches,
        fetchBranches,
        deleteBranch: handleDeleteBranch,
        createBranch: handleCreateBranch,
        // Tags
        loadingTags,
        tags,
        fetchTags,
        deleteTag: handleDeleteTag,
        createTag: handleCreateTag,
        // Commits
        loadingCommits,
        commits,
        fetchCommits,
        commitChanges,
        revertChanges,
        fetchLastModification,
        // Diff
        fetchDiff,
        fetchDiffContent,
        mergeRefs: handleMergeRefs,
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
