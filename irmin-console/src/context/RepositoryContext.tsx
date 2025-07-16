'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { useRepositoryBranches } from '@/hooks/api';

import { constructBaseUrl } from '@/utils/constructBaseUrl';
import { createQueryString } from '@/utils/queryParams';

import type { Repository } from '@/types/core/Repository';

/**
 * Repository context props
 */
interface RepositoryContextProps {
  // Active repository state
  repository: Repository;
  immutable: boolean;
  currentRef?: string;
  updateCurrentRef: (_ref?: string, _disableRedirect?: boolean) => string;
  viewRef: (_ref: string) => void;
  defaultRef?: string;
}

const RepositoryContext = createContext<RepositoryContextProps | undefined>(
  undefined
);

/**
 * Repository context for state management and interactions with the repository, branches, commits and objects
 *
 * @param config - Repository context provider configuration
 * @param config.children - Child components
 * @param config.repository - Repository object
 *
 * @returns Repository context provider
 */
export const RepositoryProvider = ({
  children,
  repository,
}: {
  children: React.ReactNode;
  repository: Repository;
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { repositoryBranchesQuery } = useRepositoryBranches(repository.slug);

  // Initial ref to default to
  const defaultRef = useMemo(
    () => searchParams.get('ref') ?? repository.default_branch,
    [searchParams, repository.default_branch]
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
    if (!currentRef || !repository || !repositoryBranchesQuery.data?.data)
      return true;
    // Check if the repository as a whole is immutable
    if (repository?.is_immutable) return true;
    // If current ref is not a branch, return false
    const branch = repositoryBranchesQuery.data?.data.find(
      (b) => b.name === currentRef
    );
    if (!branch) return true;
    // Check if the branch is immutable
    return branch.is_immutable;
  }, [repositoryBranchesQuery, repository, currentRef]);

  return (
    <RepositoryContext.Provider
      value={{
        repository,
        immutable,
        currentRef,
        updateCurrentRef,
        viewRef,
        defaultRef,
      }}
    >
      {children}
    </RepositoryContext.Provider>
  );
};

/**
 * Hook to use the repository context
 */
export const useRepositoryContext = (): RepositoryContextProps => {
  const context = useContext(RepositoryContext);
  if (!context) {
    throw new Error('useRepository must be used within a RepositoryProvider');
  }
  return context;
};
