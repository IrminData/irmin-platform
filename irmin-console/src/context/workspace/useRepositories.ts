'use client';

import { useState } from 'react';

import IrminCore from '@/services/core/IrminCore';

import { Repository } from '@/types/core/Repository';
import { Workspace } from '@/types/core/Workspace';

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
  irminCore,
}: {
  currentWorkspace: Workspace | null;
  irminCore: IrminCore;
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
    irminCore
  );

  /**
   * Hook to create a new repository.
   */
  const createRepository = useCreateRepository(
    repositories,
    setRepositories,
    irminCore
  );

  /**
   * Hook to update a repository.
   */
  const updateRepository = useUpdateRepository(
    repositories,
    setRepositories,
    irminCore
  );

  /**
   * Hook to delete a repository.
   */
  const deleteRepository = useDeleteRepository(
    repositories,
    setRepositories,
    irminCore
  );

  /**
   * Hook to reassign repository to a new owner.
   */
  const reassignRepository = useReassignRepository(
    repositories,
    setRepositories,
    irminCore
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
