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
 * @param setDataRepositories - Function to update the repositories state.
 * @param loading - Loading state to prevent multiple simultaneous fetches.
 * @param setLoading - Function to update the loading state.
 * @param fetchedFor - The slug of the workspace workflows are fetched for.
 * @param setFetchedFor - Function to update fetched for state.
 * @param locale - The current locale.
 */
export const useFetchDataRepositories = (
  currentWorkspace: Workspace | null,
  setDataRepositories: React.Dispatch<React.SetStateAction<Repository[]>>,
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
          setDataRepositories([]);
          return;
        }
        // Fetch the connections for the current workspace
        const response = await repositoryService.fetchDataRepositories();
        setDataRepositories(response.data);
      } finally {
        setLoading(false);
      }
    },
    [
      currentWorkspace,
      setDataRepositories,
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
 * @param setDataRepositories - Function to update the repositories state.
 * @param locale - The current locale.
 */
export const useCreateDataRepository = (
  repositories: Repository[],
  setDataRepositories: React.Dispatch<React.SetStateAction<Repository[]>>,
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
      const response = await repositoryService.createDataRepo(repository);
      // Update the local state with the new repository
      if (response.data) {
        setDataRepositories([...repositories, response.data]);
      }
      // Return the response from the API
      return response;
    },
    [repositories, setDataRepositories, locale]
  );

/**
 * Hook to update a Repository.
 *
 * @param repositories - The current list of Repositories
 * @param setDataRepositories - Function to update the repositories state.
 * @param locale - The current locale.
 */
export const useUpdateDataRepository = (
  repositories: Repository[],
  setDataRepositories: React.Dispatch<React.SetStateAction<Repository[]>>,
  locale: Locale
) =>
  useCallback(
    /**
     * Update a Repository using the {@link IrminCore}.
     * Updates the context state accordingly.
     *
     * @param dataRepoSlug - The slug of the Repository to update
     * @param updatedDataRepo - The updated Repository object
     */
    async (dataRepoSlug: string, updatedDataRepo: Repository) => {
      // Update the repository
      const { repositoryService } = new IrminCore(locale);
      const response = await repositoryService.updateDataRepo(
        dataRepoSlug,
        updatedDataRepo
      );
      // Update the local state with the updated repository
      const updatedDataRepositories = repositories.map((repo) =>
        repo.slug === dataRepoSlug ? { ...repo, ...updatedDataRepo } : repo
      );
      setDataRepositories(updatedDataRepositories);
      // Return the response from the API
      return response;
    },
    [repositories, setDataRepositories, locale]
  );

/**
 * Hook to delete a Repository.
 *
 * @param repositories - The current list of Repositories
 * @param setDataRepositories - Function to update the repositories state.
 * @param locale - The current locale.
 */
export const useDeleteDataRepository = (
  repositories: Repository[],
  setDataRepositories: React.Dispatch<React.SetStateAction<Repository[]>>,
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
      const response = await repositoryService.deleteDataRepo(dataRepoSlug);
      // Update the local state by removing the deleted repository
      const updatedDataRepositories = repositories.filter(
        (repo) => repo.slug !== dataRepoSlug
      );
      setDataRepositories(updatedDataRepositories);
      // Return the response from the API
      return response;
    },
    [repositories, setDataRepositories, locale]
  );

/**
 * Hook to reassign a Repository to a new owner.
 *
 * @param repositories - The current list of Repositories
 * @param setDataRepositories - Function to update the repositories state.
 * @param locale - The current locale.
 */
export const useReassignDataRepository = (
  repositories: Repository[],
  setDataRepositories: React.Dispatch<React.SetStateAction<Repository[]>>,
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
      const response = await repositoryService.reassignDataRepo(
        repository,
        newOwner
      );
      // Update the local state by changing the owner prop to the new owner
      const updatedDataRepositories = repositories.map((repo) =>
        repo.slug === repository.slug ? { ...repo, owner: newOwner } : repo
      );
      setDataRepositories(updatedDataRepositories);
      // Return the response from the API
      return response;
    },
    [repositories, setDataRepositories, locale]
  );
