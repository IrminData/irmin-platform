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
  revertUncommittedChanges,
} from '@/lib/actions/commits';
import { getDiff, mergeRefs } from '@/lib/actions/diff';
import {
  copyObject,
  deleteObject,
  getObject,
  getObjectContent,
  getObjectHistory,
  getObjectSchema,
  moveObject,
  uploadObject,
} from '@/lib/actions/objects';
import {
  deleteRepository,
  getRepository,
  getRepositoryDownloadLink,
  transferRepository,
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

import { useWorkspace } from './WorkspaceContext';

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
  transferRepository: (ownerID: string) => Promise<void>;
  downloadRepository: (selectedPath?: string) => Promise<void>;
  // Objects
  loadingObjects: boolean;
  directory: Object | undefined;
  deleteObject: (objectPath: string) => Promise<void>;
  moveObject: (oldPath: string, newPath: string) => Promise<void>;
  copyObject: (oldPath: string, newPath: string) => Promise<void>;
  createGroup: (path: string, ref: string) => Promise<void>;
  uploadObject: (path: string, ref: string, files: FileList) => Promise<void>;
  getObjectContent: (
    objectPath: string,
    raw?: boolean,
    type?: ContentType
  ) => Promise<IrminAPIBinaryResponse | undefined>;
  getObjectSchema: (objectPath: string) => Promise<ObjectSchema | undefined>;
  getObjectCommitHistory: (objectPath: string) => Promise<Commit[]>;
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
    strategy: MergeStrategy,
    squash: boolean
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
  const { workspaceSlug } = useWorkspace();

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
      const newRepository = await getRepository({
        workspace: workspaceSlug,
        repositorySlug,
      });
      if (!newRepository.data) return;
      setRepository(newRepository.data);
    } catch (error) {
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Failed to fetch the repository'
      );
    }
  }, [workspaceSlug, repositorySlug, irminAlert]);

  // Delete the current repository
  const handleDeleteRepository = useCallback(async () => {
    const confirmed = await irminConfirm(
      'warning',
      `${dict.common.areYouSureYouWantToDelete} (${currentRepository.name})`
    );
    if (updating.current || !confirmed) return;
    try {
      updating.current = true;
      const res = await deleteRepository({
        workspace: workspaceSlug,
        repositorySlug,
      });
      irminAlert('success', res.message ?? 'Repository deleted successfully');
    } catch (error) {
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Error deleting the repository'
      );
    } finally {
      updating.current = false;
    }
  }, [
    workspaceSlug,
    repositorySlug,
    currentRepository.name,
    dict,
    irminAlert,
    irminConfirm,
  ]);

  // Update the current repository
  type RepositoryUpdateInput = {
    name?: string;
    description?: string;
    documentation?: string;
    isImmutable?: boolean;
    garbageDefaultRetentionDays?: number;
    garbageDefaultBranchRetentionDays?: number;
  };
  const handleUpdateRepository = useCallback(
    async (updateInput: RepositoryUpdateInput) => {
      if (updating.current) return;
      try {
        updating.current = true;
        const res = await updateRepository({
          workspace: workspaceSlug,
          repositorySlug,
          ...updateInput,
        });
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
    [workspaceSlug, repositorySlug, fetchRepository, irminAlert]
  );

  // TransferOwnership the current repository
  const handleTransferOwnershipRepository = useCallback(
    async (ownerID: string) => {
      const confirmed = await irminConfirm(
        'warning',
        `${dict.common.areYouSureYouWantToTransferOwnership} (${currentRepository.name})`
      );
      if (updating.current || !confirmed) return;
      try {
        updating.current = true;
        const res = await transferRepository({
          workspace: workspaceSlug,
          repositorySlug,
          ownerID,
        });
        await fetchRepository();
        irminAlert(
          'success',
          res.message ?? 'Repository transfered successfully'
        );
      } catch (error) {
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Error transfering the repository'
        );
      } finally {
        updating.current = false;
      }
    },
    [
      workspaceSlug,
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
        const res = await getRepositoryDownloadLink({
          workspace: workspaceSlug,
          repositorySlug,
          ref: currentRef ?? initialRepository.default_branch,
          path: selectedPath ?? currentPath,
        });
        if (typeof res.data === 'string') {
          irminAlert(
            'success',
            res.message ?? 'Repository downloaded successfully'
          );
          window.open(res.data, '_blank');
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
    [
      workspaceSlug,
      repositorySlug,
      initialRepository,
      currentRef,
      currentPath,
      irminAlert,
    ]
  );

  // Objects state
  const [loadingObjects, setLoadingObjects] = useState(false);
  const [directory, setDirectory] = useState<Object | undefined>(undefined);

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
   * Fetch the current directory of objects in the repository at the current path and ref
   */
  const fetchObjects = useCallback(async () => {
    setLoadingObjects(true);
    try {
      const currentDirectory = await getObject({
        workspace: workspaceSlug,
        repository: repositorySlug,
        path: currentPath,
        ref: currentRef,
      });
      setDirectory(currentDirectory.data);
    } catch (error) {
      console.error('RepositoryContext fetchObjects error', error);
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Failed to fetch objects'
      );
    } finally {
      setLoadingObjects(false);
    }
  }, [irminAlert, repositorySlug, workspaceSlug, currentPath, currentRef]);

  /**
   * Delete an object from the repository at path
   */
  const handleDeleteObject = useCallback(
    async (objectPath: string) => {
      try {
        const res = await deleteObject({
          workspace: workspaceSlug,
          repository: repositorySlug,
          ref: currentRef ?? initialRepository.default_branch,
          path: objectPath,
        });
        irminAlert('success', res.message ?? 'Object deleted successfully');
        fetchObjects();
      } catch (error) {
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to delete object'
        );
      }
    },
    [
      workspaceSlug,
      repositorySlug,
      initialRepository,
      currentRef,
      fetchObjects,
      irminAlert,
    ]
  );

  /**
   * Move an object in the repository to a new path
   */
  const handleMoveObject = useCallback(
    async (currentObjectPath: string, newObjectPath: string) => {
      try {
        const res = await moveObject({
          workspace: workspaceSlug,
          repository: repositorySlug,
          ref: currentRef ?? initialRepository.default_branch,
          path: currentObjectPath,
          newPath: newObjectPath,
        });
        irminAlert('success', res.message ?? 'Object moved successfully');
        fetchObjects();
      } catch (error) {
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to move object'
        );
      }
    },
    [
      workspaceSlug,
      initialRepository,
      repositorySlug,
      currentRef,
      fetchObjects,
      irminAlert,
    ]
  );

  /**
   * Copy an object in the repository to a new path
   */
  const handleCopyObject = useCallback(
    async (currentObjectPath: string, newObjectPath: string) => {
      try {
        const res = await copyObject({
          workspace: workspaceSlug,
          repository: repositorySlug,
          ref: currentRef ?? initialRepository.default_branch,
          path: currentObjectPath,
          newPath: newObjectPath,
        });
        irminAlert('success', res.message ?? 'Object copied successfully');
        fetchObjects();
      } catch (error) {
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to copy object'
        );
      }
    },
    [
      workspaceSlug,
      repositorySlug,
      initialRepository,
      currentRef,
      fetchObjects,
      irminAlert,
    ]
  );

  /**
   * Create a group (e.g. directory) in the repository at path
   */
  const handleCreateGroup = useCallback(
    async (path: string, ref: string) => {
      try {
        const res = await uploadObject({
          workspace: workspaceSlug,
          repository: repositorySlug,
          ref: ref ?? currentRef ?? initialRepository.default_branch,
          path,
        });
        irminAlert('success', res.message ?? 'Group created successfully');
        fetchObjects();
      } catch (error) {
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to create directory'
        );
      }
    },
    [
      workspaceSlug,
      currentRef,
      initialRepository,
      repositorySlug,
      fetchObjects,
      irminAlert,
    ]
  );

  /**
   * Upload an object to the repository at path
   */
  const handleUploadObject = useCallback(
    async (path: string, ref: string | undefined, files: FileList) => {
      try {
        const res = await uploadObject({
          workspace: workspaceSlug,
          repository: repositorySlug,
          ref: ref ?? currentRef ?? initialRepository.default_branch,
          path,
          files,
        });
        irminAlert('success', res.message ?? 'Object uploaded successfully');
        fetchObjects();
      } catch (error) {
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to upload object'
        );
      }
    },
    [
      workspaceSlug,
      repositorySlug,
      initialRepository,
      currentRef,
      fetchObjects,
      irminAlert,
    ]
  );

  /**
   * Fetch the content of the object at path
   */
  const fetchObjectContent = useCallback(
    async (path: string) => {
      try {
        const res = await getObjectContent({
          workspace: workspaceSlug,
          repository: repositorySlug,
          path,
          ref: currentRef,
        });
        return res;
      } catch (error) {
        console.error('RepositoryContext fetchObjectContent error', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to fetch object content'
        );
      }
    },
    [workspaceSlug, repositorySlug, currentRef, irminAlert]
  );

  /**
   * Fetch the schema of the object at path
   */
  const fetchObjectSchema = useCallback(
    async (path: string) => {
      try {
        const res = await getObjectSchema({
          workspace: workspaceSlug,
          repository: repositorySlug,
          path,
          ref: currentRef,
        });
        return res.data;
      } catch (error) {
        console.error('RepositoryContext fetchObjectSchema error', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to fetch object schema'
        );
      }
    },
    [repositorySlug, currentRef, irminAlert, workspaceSlug]
  );

  /**
   * Fetch the branches and default branch for the current repository
   */
  const fetchBranches = useCallback(async () => {
    setLoadingBranches(true);
    try {
      const newBranches = await getBranches({
        workspace: workspaceSlug,
        repository: repositorySlug,
      });
      setBranches(newBranches.data ?? []);
    } catch (error) {
      console.error('RepositoryContext fetchBranches error', error);
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Failed to fetch branches'
      );
    } finally {
      setLoadingBranches(false);
    }
  }, [workspaceSlug, repositorySlug, irminAlert]);

  /**
   * Fetch the tags for the current repository
   */
  const fetchTags = useCallback(async () => {
    setLoadingTags(true);
    try {
      // Fetch and set the tags
      const tags = await getTags({
        workspace: workspaceSlug,
        repository: repositorySlug,
      });
      setTags(tags.data ?? []);
    } catch (error) {
      console.error('RepositoryContext fetchTags error', error);
      irminAlert('error', (error as Error)?.message ?? 'Failed to fetch tags');
    } finally {
      setLoadingTags(false);
    }
  }, [workspaceSlug, repositorySlug, irminAlert]);

  /**
   * Fetch the commits for a specific ref or the current ref
   */
  const fetchCommits = useCallback(
    async (ref?: string) => {
      setLoadingCommits(true);
      try {
        const newCommits = await getCommits({
          workspace: workspaceSlug,
          repository: repositorySlug,
          ref: ref ?? currentRef,
        });
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
    [workspaceSlug, repositorySlug, currentRef, irminAlert]
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
        const res = await getDiff({
          workspace: workspaceSlug,
          repository: repositorySlug,
          baseRef: base,
          compareRef: compare,
        });
        return res?.data ?? null;
      } catch (error) {
        console.error(error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to fetch diff for refs'
        );
      }
      return null;
    },
    [workspaceSlug, repositorySlug, irminAlert]
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
          getObjectContent({
            workspace: workspaceSlug,
            repository: repositorySlug,
            path: objectPath,
            ref: base,
          }),
          getObjectContent({
            workspace: workspaceSlug,
            repository: repositorySlug,
            path: objectPath,
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
    [workspaceSlug, repositorySlug, irminAlert]
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
        const res = await createCommit({
          workspace: workspaceSlug,
          repository: repositorySlug,
          branch: currentRef,
          message,
        });
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
    [workspaceSlug, repositorySlug, currentRef, fetchCommits, irminAlert]
  );

  /**
   * Hook to fetch the last commit which modified an object
   *
   * @param objectPath - The path of the object to check
   * @returns Commit - The last commit which modified the object, null if failed
   */
  const fetchObjectChangeHistory = useCallback(
    async (objectPath: string): Promise<Commit[]> => {
      try {
        const res = await getObjectHistory({
          workspace: workspaceSlug,
          repository: repositorySlug,
          path: objectPath,
          ref: currentRef,
        });
        return res.data ?? [];
      } catch (error) {
        console.error('RepositoryContext fetchLastModification error', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to fetch last commit for object'
        );
      }
      return [];
    },
    [workspaceSlug, repositorySlug, currentRef, irminAlert]
  );

  /**
   * Hook to revert the uncommitted changes on the current branch
   *
   * @returns boolean - True if the revert was successful, false otherwise
   */
  const revertChanges = useCallback(async (): Promise<boolean> => {
    try {
      if (!currentRef) return false;
      const res = await revertUncommittedChanges({
        workspace: workspaceSlug,
        repository: repositorySlug,
        branch: currentRef,
        path: '/',
        pathType: 'reset',
      });
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
  }, [workspaceSlug, repositorySlug, currentRef, irminAlert]);

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
      strategy: MergeStrategy,
      squash: boolean
    ): Promise<boolean> => {
      try {
        const res = await mergeRefs({
          workspace: workspaceSlug,
          repository: repositorySlug,
          baseRef: base,
          compareRef: compare,
          description,
          mergeStrategy: strategy,
          squash,
          allowEmpty: true,
        });
        irminAlert('success', res.message ?? 'Successfully merged');
        return true;
      } catch (error) {
        console.error('RepositoryContext mergeRefs error', error);
        irminAlert('error', (error as Error)?.message ?? 'Merge failed');
      }
      return false;
    },
    [workspaceSlug, repositorySlug, irminAlert]
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
        const res = await deleteBranch({
          workspace: workspaceSlug,
          repository: repositorySlug,
          branch,
        });
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
    [workspaceSlug, repositorySlug, fetchBranches, irminAlert]
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
        const res = await createBranch({
          workspace: workspaceSlug,
          repository: repositorySlug,
          from,
          name,
        });
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
    [workspaceSlug, repositorySlug, fetchBranches, irminAlert]
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
        const res = await deleteTag({
          workspace: workspaceSlug,
          repository: repositorySlug,
          tagID: tag,
        });
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
    [workspaceSlug, repositorySlug, fetchTags, irminAlert]
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
        const res = await createTag({
          workspace: workspaceSlug,
          repository: repositorySlug,
          name,
          ref,
        });
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
    [workspaceSlug, repositorySlug, fetchTags, irminAlert]
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
        transferRepository: handleTransferOwnershipRepository,
        downloadRepository: handleRpositoryDownload,
        // Objects
        loadingObjects,
        directory,
        deleteObject: handleDeleteObject,
        moveObject: handleMoveObject,
        copyObject: handleCopyObject,
        createGroup: handleCreateGroup,
        uploadObject: handleUploadObject,
        getObjectContent: fetchObjectContent,
        getObjectSchema: fetchObjectSchema,
        getObjectCommitHistory: fetchObjectChangeHistory,
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
