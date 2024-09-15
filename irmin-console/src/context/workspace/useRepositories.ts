'use client';

import { useState } from 'react';

import { Locale } from '@/dictionaries';

import { Repository } from '@/types/api/Repository';
import { Workspace } from '@/types/api/Workspace';

import {
  useCreateRepository,
  useDeleteRepository,
  useFetchRepositories,
  useReassignRepository,
  useUpdateRepository,
} from './hooks/repositories';

/**
 * Hook for Repositories to be used in the Workspace Provider
 */
const useRepositories = ({
  currentWorkspace,
  locale,
}: {
  currentWorkspace: Workspace | null;
  locale: Locale;
}) => {
  // Repositories
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchedFor, setFetchedFor] = useState<string | null>(null);

  /**
   * Hook to fetch the repositories for the current workspace.
   */
  const fetchRepositories = useFetchRepositories(
    currentWorkspace,
    setRepositories,
    loading,
    setLoading,
    fetchedFor,
    setFetchedFor,
    locale
  );

  /**
   * Hook to create a new repository.
   */
  const createRepository = useCreateRepository(
    repositories,
    setRepositories,
    locale
  );

  /**
   * Hook to update a repository.
   */
  const updateRepository = useUpdateRepository(
    repositories,
    setRepositories,
    locale
  );

  /**
   * Hook to delete a repository.
   */
  const deleteRepository = useDeleteRepository(
    repositories,
    setRepositories,
    locale
  );

  /**
   * Hook to reassign repository to a new owner.
   */
  const reassignRepository = useReassignRepository(
    repositories,
    setRepositories,
    locale
  );

  return {
    repositories,
    isLoading: loading,
    setRepositories,
    fetchRepositories,
    createRepository,
    updateRepository,
    deleteRepository,
    reassignRepository,
  };
};

export default useRepositories;
