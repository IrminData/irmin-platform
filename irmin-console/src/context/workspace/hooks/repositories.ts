'use client';

import { useCallback } from 'react';

import { Locale } from '@/dictionaries';
import IrminCore from '@/services/core/IrminCore';

import { Repository } from '@/types/api/Repository';
import { Workspace, WorkspaceUser } from '@/types/api/Workspace';

/**
 * Hook to fetch the list of Repositories for the current workspace.
 *
 * @param currentWorkspace - The current workspace
 * @param setRepositories - Function to update the repositories state.
 * @param loading - Loading state to prevent multiple simultaneous fetches.
 * @param setLoading - Function to update the loading state.
 * @param fetchedFor - The slug of the workspace workflows are fetched for.
 * @param setFetchedFor - Function to update fetched for state.
 * @param locale - The current locale.
 */
export const useFetchRepositories = (
  currentWorkspace: Workspace | null,
  setRepositories: React.Dispatch<React.SetStateAction<Repository[]>>,
  loading: boolean,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  fetchedFor: string | null,
  setFetchedFor: React.Dispatch<React.SetStateAction<string | null>>,
  locale: Locale
) =>
  useCallback(
    /**
     * Fetch and update context for Repositories of the current workspace using the {@link IrminCore}.
     *
     * @param forceFetch - If true, will refetch even if already fetched
     */
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
        // Get the repository service
        const { repositoryService } = new IrminCore(locale);
        // If the current workspace is not set, clear the connections
        if (!currentWorkspace) {
          setRepositories([]);
          return;
        }
        // Fetch the connections for the current workspace
        const response = await repositoryService.fetchRepositories();
        setRepositories(response.data);
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
      locale,
    ]
  );

/**
 * Hook to create a new Repository.
 *
 * @param repositories - The current list of Repositories
 * @param setRepositories - Function to update the repositories state.
 * @param locale - The current locale.
 */
export const useCreateRepository = (
  repositories: Repository[],
  setRepositories: React.Dispatch<React.SetStateAction<Repository[]>>,
  locale: Locale
) =>
  useCallback(
    /**
     * Create a new Repository using the {@link IrminCore}.
     * Updates the context state accordingly.
     *
     * @param repository - The Repository object to create with data being the new Repository
     */
    async (repository: Repository) => {
      // Create the repository
      const { repositoryService } = new IrminCore(locale);
      const response = await repositoryService.createRepository(repository);
      // Update the local state with the new repository
      if (response.data) {
        setRepositories([...repositories, response.data]);
      }
      // Return the response from the API
      return response;
    },
    [repositories, setRepositories, locale]
  );

/**
 * Hook to update a Repository.
 *
 * @param repositories - The current list of Repositories
 * @param setRepositories - Function to update the repositories state.
 * @param locale - The current locale.
 */
export const useUpdateRepository = (
  repositories: Repository[],
  setRepositories: React.Dispatch<React.SetStateAction<Repository[]>>,
  locale: Locale
) =>
  useCallback(
    /**
     * Update a Repository using the {@link IrminCore}.
     * Updates the context state accordingly.
     *
     * @param dataRepoSlug - The slug of the Repository to update
     * @param updatedRepository - The updated Repository object
     */
    async (dataRepoSlug: string, updatedRepository: Repository) => {
      // Update the repository
      const { repositoryService } = new IrminCore(locale);
      const response = await repositoryService.updateRepository(
        dataRepoSlug,
        updatedRepository
      );
      // Update the local state with the updated repository
      const updatedRepositories = repositories.map((repo) =>
        repo.slug === dataRepoSlug ? { ...repo, ...updatedRepository } : repo
      );
      setRepositories(updatedRepositories);
      // Return the response from the API
      return response;
    },
    [repositories, setRepositories, locale]
  );

/**
 * Hook to delete a Repository.
 *
 * @param repositories - The current list of Repositories
 * @param setRepositories - Function to update the repositories state.
 * @param locale - The current locale.
 */
export const useDeleteRepository = (
  repositories: Repository[],
  setRepositories: React.Dispatch<React.SetStateAction<Repository[]>>,
  locale: Locale
) =>
  useCallback(
    /**
     * Delete a Repository using the {@link IrminCore}.
     * Updates the context state accordingly.
     *
     * @param dataRepoSlug - The slug of the Repository to delete
     */
    async (dataRepoSlug: string) => {
      // Delete the repository
      const { repositoryService } = new IrminCore(locale);
      const response = await repositoryService.deleteRepository(dataRepoSlug);
      // Update the local state by removing the deleted repository
      const updatedRepositories = repositories.filter(
        (repo) => repo.slug !== dataRepoSlug
      );
      setRepositories(updatedRepositories);
      // Return the response from the API
      return response;
    },
    [repositories, setRepositories, locale]
  );

/**
 * Hook to reassign a Repository to a new owner.
 *
 * @param repositories - The current list of Repositories
 * @param setRepositories - Function to update the repositories state.
 * @param locale - The current locale.
 */
export const useReassignRepository = (
  repositories: Repository[],
  setRepositories: React.Dispatch<React.SetStateAction<Repository[]>>,
  locale: Locale
) =>
  useCallback(
    /**
     * Reassign Repository ownership using the {@link IrminCore}.
     * Updates the context state accordingly.
     *
     * @param repository - The Repository object to reassign ownership over
     * @param newOwner - The Workspace User object for the new owner
     */
    async (repository: Repository, newOwner: WorkspaceUser) => {
      // Reassign the Repositories
      const { repositoryService } = new IrminCore(locale);
      const response = await repositoryService.reassignRepository(
        repository,
        newOwner
      );
      // Update the local state by changing the owner prop to the new owner
      const updatedRepositories = repositories.map((repo) =>
        repo.slug === repository.slug ? { ...repo, owner: newOwner } : repo
      );
      setRepositories(updatedRepositories);
      // Return the response from the API
      return response;
    },
    [repositories, setRepositories, locale]
  );
