'use client';

import { useCallback } from 'react';

import IrminCore from '@/services/core/IrminCore';

import { Repository } from '@/types/core/Repository';
import { User } from '@/types/core/User';
import { Workspace } from '@/types/core/Workspace';

/**
 * Hook to fetch the list of Repositories for the current workspace using the {@link IrminCore}.
 */
export const useFetchRepositories = (
  currentWorkspace: Workspace | null,
  setRepositories: React.Dispatch<React.SetStateAction<Repository[]>>,
  loading: boolean,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  fetchedFor: string | null,
  setFetchedFor: React.Dispatch<React.SetStateAction<string | null>>,
  irminCore: IrminCore
) =>
  useCallback(
    async (forceFetch?: boolean) => {
      // Check if the connections are already fetched for the current workspace
      if (!forceFetch) {
        if (!fetchedFor && !currentWorkspace) return;
        if (fetchedFor === currentWorkspace?.slug) return;
      }
      setFetchedFor(currentWorkspace?.slug ?? null);
      // Prevent multiple simultaneous fetches
      if (loading) return;
      setLoading(true);
      try {
        // If the current workspace is not set, clear the connections
        if (!currentWorkspace) {
          setRepositories([]);
          return;
        }
        // Fetch the connections for the current workspace
        const res = await irminCore.repositoryService.fetchRepositories();
        setRepositories(res.data);
      } finally {
        setLoading(false);
      }
    },
    [
      currentWorkspace,
      setRepositories,
      loading,
      setLoading,
      fetchedFor,
      setFetchedFor,
      irminCore,
    ]
  );

/**
 * Hook to create a new Repository using the {@link IrminCore}.
 */
export const useCreateRepository = (
  repositories: Repository[],
  setRepositories: React.Dispatch<React.SetStateAction<Repository[]>>,
  irminCore: IrminCore
) =>
  useCallback(
    async (repository: Repository) => {
      // Create the repository
      const res =
        await irminCore.repositoryService.createRepository(repository);
      // Update the local state with the new repository
      if (res.data) {
        setRepositories([...repositories, res.data]);
      }
      // Return the res from the API
      return res;
    },
    [repositories, setRepositories, irminCore]
  );

/**
 * Hook to update a Repository using the {@link IrminCore}.
 */
export const useUpdateRepository = (
  repositories: Repository[],
  setRepositories: React.Dispatch<React.SetStateAction<Repository[]>>,
  irminCore: IrminCore
) =>
  useCallback(
    async (repositorySlug: string, updatedRepository: Repository) => {
      // Update the repository
      const res = await irminCore.repositoryService.updateRepository(
        repositorySlug,
        updatedRepository
      );
      // Update the local state with the updated repository
      const updatedRepositories = repositories.map((repo) =>
        repo.slug === repositorySlug ? { ...repo, ...updatedRepository } : repo
      );
      setRepositories(updatedRepositories);
      // Return the res from the API
      return res;
    },
    [repositories, setRepositories, irminCore]
  );

/**
 * Hook to delete a Repository using the {@link IrminCore}.
 */
export const useDeleteRepository = (
  repositories: Repository[],
  setRepositories: React.Dispatch<React.SetStateAction<Repository[]>>,
  irminCore: IrminCore
) =>
  useCallback(
    async (repositorySlug: string) => {
      // Delete the repository
      const res =
        await irminCore.repositoryService.deleteRepository(repositorySlug);
      // Update the local state by removing the deleted repository
      const updatedRepositories = repositories.filter(
        (repo) => repo.slug !== repositorySlug
      );
      setRepositories(updatedRepositories);
      // Return the res from the API
      return res;
    },
    [repositories, setRepositories, irminCore]
  );

/**
 * Hook to reassign a Repository to a new owner using the {@link IrminCore}.
 */
export const useReassignRepository = (
  repositories: Repository[],
  setRepositories: React.Dispatch<React.SetStateAction<Repository[]>>,
  irminCore: IrminCore
) =>
  useCallback(
    async (repository: Repository, newOwner: User) => {
      // Reassign the Repositories
      const res = await irminCore.repositoryService.reassignRepository(
        repository,
        newOwner
      );
      // Update the local state by changing the owner prop to the new owner
      const updatedRepositories = repositories.map((repo) =>
        repo.slug === repository.slug ? { ...repo, owner: newOwner } : repo
      );
      setRepositories(updatedRepositories);
      // Return the res from the API
      return res;
    },
    [repositories, setRepositories, irminCore]
  );
