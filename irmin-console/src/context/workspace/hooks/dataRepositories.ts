'use client';

import { useCallback } from 'react';

import { Locale } from '@/dictionaries';
import DataRepoService from '@/services/api/DataRepoService';

import { DataRepo } from '@/types/api/DataRepo';
import { Workspace, WorkspaceUser } from '@/types/api/Workspace';

/**
 * Hook to fetch the list of DataRepositories for the current workspace.
 *
 * @param currentWorkspace - The current workspace
 * @param setDataRepositories - Function to update the dataRepositories state.
 * @param loading - Loading state to prevent multiple simultaneous fetches.
 * @param setLoading - Function to update the loading state.
 * @param fetchedFor - The slug of the workspace workflows are fetched for.
 * @param setFetchedFor - Function to update fetched for state.
 * @param locale - The current locale.
 */
export const useFetchDataRepositories = (
  currentWorkspace: Workspace | null,
  setDataRepositories: React.Dispatch<React.SetStateAction<DataRepo[]>>,
  loading: boolean,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  fetchedFor: string | null,
  setFetchedFor: React.Dispatch<React.SetStateAction<string | null>>,
  locale: Locale
) =>
  useCallback(
    /**
     * Fetch and update context for Data Repositories of the current workspace using the {@link DataRepoService}.
     *
     * @param forceFetch - If true, will refetch even if already fetched
     *
     * @returns Error if the fetch fails
     */
    async (forceFetch?: boolean) => {
      // Check if the connections are already fetched for the current workspace
      if (!forceFetch) {
        if (!fetchedFor && !currentWorkspace) return;
        if (fetchedFor === currentWorkspace?.slug) return;
      }
      setFetchedFor(currentWorkspace?.slug ?? null);
      // Get the data repository service
      const datasetService = DataRepoService.getInstance(locale);
      // If the current workspace is not set, clear the connections
      if (!currentWorkspace) {
        setDataRepositories([]);
        return;
      }
      try {
        // Prevent multiple simultaneous fetches
        if (loading) return;
        setLoading(true);
        // Fetch the connections for the current workspace
        const response = await datasetService.fetchAllDataRepositories();
        setDataRepositories(response.data);
        setLoading(false);
      } catch (e) {
        setLoading(false);
        throw e;
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
 * Hook to create a new Data Repository.
 *
 * @param dataRepositories - The current list of Data Repositories
 * @param setDataRepositories - Function to update the dataRepositories state.
 * @param locale - The current locale.
 */
export const useCreateDataRepository = (
  dataRepositories: DataRepo[],
  setDataRepositories: React.Dispatch<React.SetStateAction<DataRepo[]>>,
  locale: Locale
) =>
  useCallback(
    /**
     * Create a new Data Repository using the {@link DataRepoService}.
     * Updates the context state accordingly.
     *
     * @param dataRepo - The Data Repository object to create
     *
     * @returns response from the API with data being the new Data Repository
     */
    async (dataRepo: DataRepo) => {
      // Create the data repository
      const datasetService = DataRepoService.getInstance(locale);
      const response = await datasetService.createDataRepo(dataRepo);
      // Update the local state with the new data repository
      if (response.data) {
        setDataRepositories([...dataRepositories, response.data]);
      }
      // Return the response from the API
      return response;
    },
    [dataRepositories, setDataRepositories, locale]
  );

/**
 * Hook to update a Data Repository.
 *
 * @param dataRepositories - The current list of Data Repositories
 * @param setDataRepositories - Function to update the dataRepositories state.
 * @param locale - The current locale.
 */
export const useUpdateDataRepository = (
  dataRepositories: DataRepo[],
  setDataRepositories: React.Dispatch<React.SetStateAction<DataRepo[]>>,
  locale: Locale
) =>
  useCallback(
    /**
     * Update a Data Repository using the {@link DataRepoService}.
     * Updates the context state accordingly.
     *
     * @param dataRepoSlug - The slug of the Data Repository to update
     * @param updatedDataRepo - The updated Data Repository object
     *
     * @returns response from the API
     */
    async (dataRepoSlug: string, updatedDataRepo: DataRepo) => {
      // Update the data repository
      const datasetService = DataRepoService.getInstance(locale);
      const response = await datasetService.updateDataRepo(
        dataRepoSlug,
        updatedDataRepo
      );
      // Update the local state with the updated data repository
      const updatedDataRepositories = dataRepositories.map((repo) =>
        repo.slug === dataRepoSlug ? { ...repo, ...updatedDataRepo } : repo
      );
      setDataRepositories(updatedDataRepositories);
      // Return the response from the API
      return response;
    },
    [dataRepositories, setDataRepositories, locale]
  );

/**
 * Hook to delete a Data Repository.
 *
 * @param dataRepositories - The current list of Data Repositories
 * @param setDataRepositories - Function to update the dataRepositories state.
 * @param locale - The current locale.
 */
export const useDeleteDataRepository = (
  dataRepositories: DataRepo[],
  setDataRepositories: React.Dispatch<React.SetStateAction<DataRepo[]>>,
  locale: Locale
) =>
  useCallback(
    /**
     * Delete a Data Repository using the {@link DataRepoService}.
     * Updates the context state accordingly.
     *
     * @param dataRepoSlug - The slug of the Data Repository to delete
     *
     * @returns response from the API
     */
    async (dataRepoSlug: string) => {
      // Delete the data repository
      const datasetService = DataRepoService.getInstance(locale);
      const response = await datasetService.deleteDataRepo(dataRepoSlug);
      // Update the local state by removing the deleted data repository
      const updatedDataRepositories = dataRepositories.filter(
        (repo) => repo.slug !== dataRepoSlug
      );
      setDataRepositories(updatedDataRepositories);
      // Return the response from the API
      return response;
    },
    [dataRepositories, setDataRepositories, locale]
  );

/**
 * Hook to reassign a Data Repository to a new owner.
 *
 * @param dataRepositories - The current list of Data Repositories
 * @param setDataRepositories - Function to update the dataRepositories state.
 * @param locale - The current locale.
 */
export const useReassignDataRepository = (
  dataRepositories: DataRepo[],
  setDataRepositories: React.Dispatch<React.SetStateAction<DataRepo[]>>,
  locale: Locale
) =>
  useCallback(
    /**
     * Reassign Data Repository ownership using the {@link DataRepoService}.
     * Updates the context state accordingly.
     *
     * @param dataRepo - The Data Repository object to reassign ownership over
     * @param newOwner - The Workspace User object for the new owner
     *
     * @returns response from the API
     */
    async (dataRepo: DataRepo, newOwner: WorkspaceUser) => {
      // Reassign the data repositories
      const datasetService = DataRepoService.getInstance(locale);
      const response = await datasetService.reassignDataRepo(
        dataRepo,
        newOwner
      );
      // Update the local state by changing the owner prop to the new owner
      const updatedDataRepositories = dataRepositories.map((repo) =>
        repo.slug === dataRepo.slug ? { ...repo, owner: newOwner } : repo
      );
      setDataRepositories(updatedDataRepositories);
      // Return the response from the API
      return response;
    },
    [dataRepositories, setDataRepositories, locale]
  );
