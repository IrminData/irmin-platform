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

import IrminCore from '@/lib/core';

import { usePopup } from '@/context/PopupContext';

import { constructBaseUrl } from '@/utils/constructBaseUrl';
import { downloadFile } from '@/utils/downloadFile';
import { createQueryString } from '@/utils/queryParams';

import { Branch } from '@/types/core/Branch';
import { Commit } from '@/types/core/Commit';
import { Diff, MergeStrategy } from '@/types/core/Diff';
import { IrminAPIBinaryResponse } from '@/types/core/IrminAPIResponse';
import { Object } from '@/types/core/Object';
import { ObjectSchema } from '@/types/core/ObjectSchema';
import { Repository } from '@/types/core/Repository';
import { Tag } from '@/types/core/Tag';
import { ItemUpdateProps } from '@/types/internal/ItemUpdateProps';

import { useIAM } from './IAMContext';
import { useLocale } from './LocaleContext';
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
  // General repository hooks
  fetchRepository: () => Promise<void>;
  updateRepository: (data: ItemUpdateProps) => Promise<void>;
  deleteRepository: () => Promise<void>;
  transferRepository: (ownerID: string) => Promise<void>;
  // Objects
  loadingObjects: boolean;
  rootObject: Object | undefined;
  fetchObject: (path?: string, ref?: string) => Promise<Object | undefined>;
  deleteObject: (objectPath: string) => Promise<void>;
  moveObject: (oldPath: string, newPath: string) => Promise<void>;
  copyObject: (oldPath: string, newPath: string) => Promise<void>;
  uploadObject: (path: string, ref: string, files: FileList) => Promise<void>;
  getObjectContent: (path: string) => Promise<IrminAPIBinaryResponse | null>;
  downloadObjectAsZip: (path: string, ref?: string) => Promise<void>;
  getObjectCommitHistory: (objectPath: string) => Promise<Commit[]>;
  getObjectSchema: (path: string) => Promise<ObjectSchema | null>;
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
  loadingDiff: boolean;
  diff: Diff | null;
  fetchUncommittedChanges: () => Promise<Diff | null>;
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
  repositorySlug,
  initialRef,
  initialRepository,
  initialBranches,
  initialTags,
  initialCommits,
}: {
  children: React.ReactNode;
  repositorySlug: string;
  initialRef?: string;
  initialRepository: Repository;
  initialBranches: Branch[];
  initialTags: Tag[];
  initialCommits: Commit[];
}) => {
  const { getToken } = useIAM();
  const { dict, locale } = useLocale();
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
      const token = await getToken();
      const irminCore = new IrminCore(locale, token);
      const newRepository = await irminCore.repositoryService.fetchRepository({
        workspace: workspaceSlug,
        slug: repositorySlug,
      });
      if (!newRepository.data) return;
      setRepository(newRepository.data);
    } catch (error) {
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Failed to fetch the repository'
      );
    }
  }, [workspaceSlug, repositorySlug, irminAlert, getToken, locale]);

  // Delete the current repository
  const handleDeleteRepository = useCallback(async () => {
    const confirmed = await irminConfirm(
      'warning',
      `${dict.common.areYouSureYouWantToDelete} (${currentRepository.name})`
    );
    if (updating.current || !confirmed) return;
    try {
      updating.current = true;
      const token = await getToken();
      const irminCore = new IrminCore(locale, token);
      const res = await irminCore.repositoryService.deleteRepository({
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
    getToken,
    locale,
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
        const token = await getToken();
        const irminCore = new IrminCore(locale, token);
        const res = await irminCore.repositoryService.updateRepository({
          workspace: workspaceSlug,
          slug: repositorySlug,
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
    [
      workspaceSlug,
      repositorySlug,
      fetchRepository,
      irminAlert,
      getToken,
      locale,
    ]
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
        const token = await getToken();
        const irminCore = new IrminCore(locale, token);
        const res = await irminCore.repositoryService.transferRepository({
          workspace: workspaceSlug,
          slug: repositorySlug,
          newOwnerID: ownerID,
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
      getToken,
      locale,
    ]
  );

  // Objects state
  const [loadingObjects, setLoadingObjects] = useState(false);
  const [rootObject, setRootObject] = useState<Object | undefined>(undefined);

  // Branches state
  const [loadingBranches, setLoadingBranches] = useState<boolean>(false);
  const [branches, setBranches] = useState<Branch[]>(initialBranches);

  // Tags state
  const [loadingTags, setLoadingTags] = useState<boolean>(false);
  const [tags, setTags] = useState<Tag[]>(initialTags);

  // Commits state
  const [loadingCommits, setLoadingCommits] = useState<boolean>(false);
  const [commits, setCommits] = useState<Commit[]>(initialCommits);

  // Diff state
  const [loadingDiff, setLoadingDiff] = useState<boolean>(false);
  const [diff, setDiff] = useState<Diff | null>(null);

  /**
   * Fetch the current directory or any object at a specific path and ref
   */
  const fetchObject = useCallback(
    async (path?: string, ref?: string) => {
      try {
        setLoadingObjects(true);
        const token = await getToken();
        const irminCore = new IrminCore(locale, token);
        const foundObject = await irminCore.objectService.getObjectAtPath({
          workspace: workspaceSlug,
          repository: repositorySlug,
          path: path ?? '/',
          ref: ref ?? currentRef,
        });
        if (!path) setRootObject(foundObject.data ?? undefined);
        return foundObject.data ?? undefined;
      } catch (error) {
        console.error('RepositoryContext fetchObject error', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to fetch objects'
        );
      } finally {
        setLoadingObjects(false);
      }
    },
    [irminAlert, repositorySlug, workspaceSlug, currentRef, locale, getToken]
  );

  /**
   * Delete an object from the repository at path
   */
  const handleDeleteObject = useCallback(
    async (objectPath: string) => {
      try {
        const token = await getToken();
        const irminCore = new IrminCore(locale, token);
        const res = await irminCore.objectService.deleteObject({
          workspace: workspaceSlug,
          repository: repositorySlug,
          ref: currentRef ?? initialRepository.default_branch,
          path: objectPath,
        });
        irminAlert('success', res.message ?? 'Object deleted successfully');
        fetchObject();
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
      fetchObject,
      irminAlert,
      getToken,
      locale,
    ]
  );

  /**
   * Move an object in the repository to a new path
   */
  const handleMoveObject = useCallback(
    async (currentObjectPath: string, newObjectPath: string) => {
      try {
        const token = await getToken();
        const irminCore = new IrminCore(locale, token);
        const res = await irminCore.objectService.moveObject({
          workspace: workspaceSlug,
          repository: repositorySlug,
          ref: currentRef ?? initialRepository.default_branch,
          path: currentObjectPath,
          newPath: newObjectPath,
        });
        irminAlert('success', res.message ?? 'Object moved successfully');
        fetchObject();
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
      fetchObject,
      irminAlert,
      getToken,
      locale,
    ]
  );

  /**
   * Copy an object in the repository to a new path
   */
  const handleCopyObject = useCallback(
    async (currentObjectPath: string, newObjectPath: string) => {
      try {
        const token = await getToken();
        const irminCore = new IrminCore(locale, token);
        const res = await irminCore.objectService.copyObject({
          workspace: workspaceSlug,
          repository: repositorySlug,
          ref: currentRef ?? initialRepository.default_branch,
          path: currentObjectPath,
          newPath: newObjectPath,
        });
        irminAlert('success', res.message ?? 'Object copied successfully');
        fetchObject();
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
      fetchObject,
      irminAlert,
      getToken,
      locale,
    ]
  );

  /**
   * Upload an object to the repository at path
   */
  const handleUploadObject = useCallback(
    async (path: string, ref: string | undefined, files: FileList) => {
      try {
        const token = await getToken();
        const irminCore = new IrminCore(locale, token);
        const res = await irminCore.objectService.uploadObject({
          workspace: workspaceSlug,
          repository: repositorySlug,
          ref: ref ?? currentRef ?? initialRepository.default_branch,
          path,
          files,
        });
        irminAlert('success', res.message ?? 'Object uploaded successfully');
        fetchObject();
      } catch (error) {
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to upload object'
        );
      }
    },
    [
      locale,
      workspaceSlug,
      repositorySlug,
      initialRepository,
      currentRef,
      fetchObject,
      irminAlert,
      getToken,
    ]
  );

  /**
   * Fetch the content of the object at path
   */
  const fetchObjectContent = useCallback(
    async (path: string) => {
      try {
        const token = await getToken();
        const irminCore = new IrminCore(locale, token);
        const res = await irminCore.objectService.getObjectContent({
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
      return null;
    },
    [workspaceSlug, repositorySlug, currentRef, irminAlert, getToken, locale]
  );

  /**
   * Download the object at path as a zip file
   */
  const downloadObjectAsZip = useCallback(
    async (path: string, ref?: string) => {
      try {
        const token = await getToken();
        const irminCore = new IrminCore(locale, token);
        const res = await irminCore.objectService.downloadObjectZip({
          workspace: workspaceSlug,
          repository: repositorySlug,
          path,
          ref: ref ?? currentRef,
        });
        if (typeof res == 'string' || res instanceof Blob) {
          // Construct the name of the file
          const objectName = path.split('/').pop() ?? 'root';
          const zipName = `${workspaceSlug}-${repositorySlug}-${ref ?? currentRef}-${objectName}.zip`;
          // Download the file
          downloadFile(res, zipName, 'application/zip');
          // Alert the user
          irminAlert('success', dict.common.downloadSuccess);
        }
      } catch (error) {
        console.error('RepositoryContext downloadObjectAsZip error', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to download object as zip'
        );
      }
    },
    [
      workspaceSlug,
      repositorySlug,
      currentRef,
      irminAlert,
      getToken,
      dict,
      locale,
    ]
  );

  /**
   * Fetch the schema of the object at path
   */
  const fetchObjectSchema = useCallback(
    async (path: string) => {
      try {
        const token = await getToken();
        const irminCore = new IrminCore(locale, token);
        const res = await irminCore.objectService.getObjectSchema({
          workspace: workspaceSlug,
          repository: repositorySlug,
          path,
          ref: currentRef,
        });
        return res.data ?? null;
      } catch (error) {
        console.error('RepositoryContext fetchObjectContent error', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to fetch object content'
        );
      }
      return null;
    },
    [workspaceSlug, repositorySlug, currentRef, irminAlert, getToken, locale]
  );

  /**
   * Fetch the branches and default branch for the current repository
   */
  const fetchBranches = useCallback(async () => {
    setLoadingBranches(true);
    try {
      const token = await getToken();
      const irminCore = new IrminCore(locale, token);
      const newBranches = await irminCore.branchService.fetchBranches({
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
  }, [workspaceSlug, repositorySlug, irminAlert, getToken, locale]);

  /**
   * Fetch the tags for the current repository
   */
  const fetchTags = useCallback(async () => {
    setLoadingTags(true);
    try {
      const token = await getToken();
      const irminCore = new IrminCore(locale, token);
      // Fetch and set the tags
      const tags = await irminCore.tagService.fetchTags({
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
  }, [workspaceSlug, repositorySlug, irminAlert, getToken, locale]);

  /**
   * Fetch the commits for a specific ref or the current ref
   */
  const fetchCommits = useCallback(
    async (ref?: string) => {
      setLoadingCommits(true);
      try {
        const token = await getToken();
        const irminCore = new IrminCore(locale, token);
        const newCommits = await irminCore.commitService.fetchCommits({
          workspace: workspaceSlug,
          repository: repositorySlug,
          ref: ref ?? currentRef,
        });
        if (!ref) setCommits(newCommits.data ?? []); // Only set commits if fetched for the current ref
        return newCommits.data ?? [];
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
    [workspaceSlug, repositorySlug, currentRef, irminAlert, getToken, locale]
  );

  /**
   * Fetch the uncommitted changes for the current branch
   */
  const fetchUncommittedChanges = useCallback(async () => {
    try {
      setLoadingDiff(true);
      // make sure that the currentRef is a branch
      let branchName = currentRepository.default_branch;
      if (currentRef) {
        for (let i = 0; i < branches.length; i++) {
          const branch = branches[i];
          if (branch.name === currentRef) {
            branchName = currentRef;
            break;
          }
        }
      }
      // get the uncommitted changes for the selected branch
      const token = await getToken();
      const irminCore = new IrminCore(locale, token);
      const res = await irminCore.branchService.getUncommittedChanges({
        workspace: workspaceSlug,
        repository: repositorySlug,
        branch: branchName,
      });
      setDiff(res.data ?? null);
      return res.data ?? null;
    } catch (error) {
      console.error('RepositoryContext fetchUncommittedChanges error', error);
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Failed to fetch uncommitted changes'
      );
    } finally {
      setLoadingDiff(false);
    }
    return null;
  }, [
    workspaceSlug,
    repositorySlug,
    currentRepository,
    currentRef,
    branches,
    irminAlert,
    getToken,
    locale,
  ]);

  /**
   * Hook to fetch the diff between two refs (eg. branches, commits)
   *
   * @param base - The base ref to compare
   * @param compare - The ref to compare with the base
   * @returns Diff - The diff between the two refs, null if failed
   */
  const fetchDiff = useCallback(
    async (base: string, compare: string) => {
      try {
        setLoadingDiff(true);
        const token = await getToken();
        const irminCore = new IrminCore(locale, token);
        const res = await irminCore.diffService.compareRefs({
          workspace: workspaceSlug,
          repository: repositorySlug,
          baseRef: base,
          compareRef: compare,
        });
        setDiff(res.data ?? null);
        return res.data ?? null;
      } catch (error) {
        console.error(error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to fetch diff for refs'
        );
      } finally {
        setLoadingDiff(false);
      }
      return null;
    },
    [workspaceSlug, repositorySlug, irminAlert, locale, getToken]
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
      base: IrminAPIBinaryResponse | null;
      compare: IrminAPIBinaryResponse | null;
    } | null> => {
      try {
        const token = await getToken();
        const irminCore = new IrminCore(locale, token);
        const [baseContent, compareContent] = await Promise.all([
          irminCore.objectService.getObjectContent({
            workspace: workspaceSlug,
            repository: repositorySlug,
            path: objectPath,
            ref: base,
          }),
          irminCore.objectService.getObjectContent({
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
    [workspaceSlug, repositorySlug, irminAlert, locale, getToken]
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
        const token = await getToken();
        const irminCore = new IrminCore(locale, token);
        const res = await irminCore.commitService.createCommit({
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
    [
      workspaceSlug,
      repositorySlug,
      currentRef,
      fetchCommits,
      irminAlert,
      getToken,
      locale,
    ]
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
        const token = await getToken();
        const irminCore = new IrminCore(locale, token);
        const res = await irminCore.objectService.getObjectHistory({
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
    [workspaceSlug, repositorySlug, currentRef, irminAlert, getToken, locale]
  );

  /**
   * Hook to revert the uncommitted changes on the current branch
   *
   * @returns boolean - True if the revert was successful, false otherwise
   */
  const revertChanges = useCallback(async (): Promise<boolean> => {
    try {
      if (!currentRef) return false;
      const token = await getToken();
      const irminCore = new IrminCore(locale, token);
      const res = await irminCore.commitService.revertUncommittedChanges({
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
  }, [workspaceSlug, repositorySlug, currentRef, irminAlert, getToken, locale]);

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
        const token = await getToken();
        const irminCore = new IrminCore(locale, token);
        const res = await irminCore.diffService.mergeRefs({
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
    [workspaceSlug, repositorySlug, irminAlert, getToken, locale]
  );

  /**
   * Hook to delete a branch from the repository.
   *
   * @param branch - The branch name to delete
   */
  const handleDeleteBranch = useCallback(
    async (branch: string) => {
      try {
        const token = await getToken();
        const irminCore = new IrminCore(locale, token);
        // Delete the branch
        const res = await irminCore.branchService.deleteBranch({
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
    [workspaceSlug, repositorySlug, fetchBranches, irminAlert, getToken, locale]
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
        const token = await getToken();
        const irminCore = new IrminCore(locale, token);
        // Create the branch
        const res = await irminCore.branchService.createBranch({
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
    [workspaceSlug, repositorySlug, fetchBranches, irminAlert, getToken, locale]
  );

  /**
   * Hook to delete a tag from the repository.
   *
   * @param tag - The tag ID to delete
   */
  const handleDeleteTag = useCallback(
    async (tag: string) => {
      try {
        const token = await getToken();
        const irminCore = new IrminCore(locale, token);
        // Delete the tag
        const res = await irminCore.tagService.deleteTag({
          workspace: workspaceSlug,
          repository: repositorySlug,
          tag,
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
    [workspaceSlug, repositorySlug, fetchTags, irminAlert, getToken, locale]
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
        const token = await getToken();
        const irminCore = new IrminCore(locale, token);
        // Create the tag
        const res = await irminCore.tagService.createTag({
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
    [workspaceSlug, repositorySlug, fetchTags, irminAlert, getToken, locale]
  );

  const objectsFetchedFor = useRef<string | undefined>(undefined);

  /**
   * Fetch the repository directory object at the active path and ref on mount and when the path or ref changes
   */
  useEffect(() => {
    if (!repositorySlug || !currentRef) return;
    if (objectsFetchedFor.current === `${repositorySlug}@${currentRef}`) return;
    objectsFetchedFor.current = `${repositorySlug}@${currentRef}`;
    fetchObject();
    fetchCommits();
  }, [repositorySlug, currentRef, fetchObject, fetchCommits]);

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
        // General repository hooks
        fetchRepository,
        updateRepository: handleUpdateRepository,
        deleteRepository: handleDeleteRepository,
        transferRepository: handleTransferOwnershipRepository,
        // Objects
        loadingObjects,
        rootObject,
        fetchObject,
        deleteObject: handleDeleteObject,
        moveObject: handleMoveObject,
        copyObject: handleCopyObject,
        uploadObject: handleUploadObject,
        getObjectContent: fetchObjectContent,
        downloadObjectAsZip,
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
        loadingDiff,
        diff,
        fetchUncommittedChanges,
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
