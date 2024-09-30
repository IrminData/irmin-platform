import IrminCore from '@/services/core/IrminCore';

import fake from '@/utils/prepareFakeResponse';

import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { Repository } from '@/types/core/Repository';
import { WorkspaceUser } from '@/types/core/Workspace';
import { exampleRepositories } from '@/types/examples/core';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment =
  process.env.NEXT_PUBLIC_ENVIRONMENT_TYPE === 'development';

/**
 * Repositories API response type (multiple)
 */
interface RepositoriesAPIResponse extends IrminAPIResponse {
  data: Repository[];
}

/**
 * Repository API response type (single)
 */
interface RepositoryAPIResponse extends IrminAPIResponse {
  data: Repository;
}

/**
 * Repository API service
 *
 * Responsible for all Repository related API calls.
 */
class RepositoryService {
  private irminCore: IrminCore;

  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.fetchRepositories = this.fetchRepositories.bind(this);
    this.createRepository = this.createRepository.bind(this);
    this.reassignRepository = this.reassignRepository.bind(this);
    this.deleteRepository = this.deleteRepository.bind(this);
    this.updateRepository = this.updateRepository.bind(this);
    this.getDownloadLink = this.getDownloadLink.bind(this);
    this.uploadCollection = this.uploadCollection.bind(this);
    this.deleteCollection = this.deleteCollection.bind(this);
  }

  /**
   * Fetch all available repositories
   * @todo Provide link to Irmin API docs
   */
  async fetchRepositories(): Promise<RepositoriesAPIResponse> {
    if (isOfflineMode)
      return fake(exampleRepositories) as RepositoriesAPIResponse;
    try {
      const response = (await this.irminCore.fetch(`/v1/repositories`, {
        method: 'GET',
      })) as RepositoriesAPIResponse;

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch Repositories error');
      if (isDevelopment)
        return fake(exampleRepositories) as RepositoriesAPIResponse;
      throw error;
    }
  }

  /**
   * Create a new Repository
   *
   * @todo Provide link to Irmin API docs
   *
   * @param repository - The Repository object to create
   *
   * @returns response from the API with data being the newly created Repository
   */
  async createRepository(
    repository: Repository
  ): Promise<RepositoryAPIResponse> {
    if (isOfflineMode)
      return fake(exampleRepositories[0]) as RepositoryAPIResponse;
    try {
      const formData = new FormData();

      formData.append('_method', 'PATCH');
      formData.append('name', repository.name);
      formData.append('description', repository.description ?? '');
      formData.append('documentation', repository.documentation ?? '');
      repository.collections.forEach((item) => {
        formData.append('collections', item.formatted_name);
      });

      const response = (await this.irminCore.fetch(`/v1/repositories/create`, {
        method: 'POST',
        body: formData,
      })) as RepositoryAPIResponse;

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Create Repositories error');
      if (isDevelopment)
        return fake(exampleRepositories[0]) as RepositoryAPIResponse;
      throw error;
    }
  }

  /**
   * Reassign the ownership of a Repository
   *
   * @todo Provide link to Irmin API docs
   *
   * @param repository - The Repository to reassign
   * @param newOwner - The new owner of the Repository
   *
   */
  async reassignRepository(repository: Repository, newOwner: WorkspaceUser) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();
      formData.append('assignee', newOwner.id.toString());

      const response = await this.irminCore.fetch(
        `/v1/repositories/${repository.slug}/reassign`,
        {
          method: 'POST',

          body: formData,
        }
      );
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Reassign Repositories error');
      if (isDevelopment) return fake();
      throw error;
    }
  }

  /**
   * Delete a Repository
   *
   * @todo Provide link to Irmin API docs
   *
   * @param dataRepoSlug - The slug of the Repository to delete
   *
   */
  async deleteRepository(dataRepoSlug: string) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();

      formData.append('_method', 'DELETE');

      const response = await this.irminCore.fetch(
        `/v1/repositories/${dataRepoSlug}/delete`,
        {
          method: 'POST',

          body: formData,
        }
      );

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Delete Repository error');
      if (isDevelopment) return fake();
      throw error;
    }
  }

  /**
   * Update a Repository
   *
   * @todo Provide link to Irmin API docs
   *
   * @param dataRepoSlug - The slug of the Repository to update
   * @param updatedRepository - The updated Repository object
   *
   */
  async updateRepository(dataRepoSlug: string, updatedRepository: Repository) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();

      formData.append('_method', 'PATCH');
      formData.append('name', updatedRepository.name);
      formData.append('description', updatedRepository.description ?? '');
      formData.append('documentation', updatedRepository.documentation ?? '');
      updatedRepository.collections.forEach((item) => {
        formData.append('collections', item.formatted_name);
      });

      const response = await this.irminCore.fetch(
        `/v1/repositories/${dataRepoSlug}/update`,
        {
          method: 'POST',
          body: formData,
        }
      );

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Update Repository error');
      if (isDevelopment) return fake();
      throw error;
    }
  }

  /**
   * Get a link to download the repository
   *
   * @todo Provide link to Irmin API docs
   *
   * @param repository - The repository to download
   * @param branch - (optional) The branch to download
   * @param ref - (optional) The ref to download
   * @param path - (optional) The path within the repository to download
   * @param redirectToSuccess - (optional) The URL to redirect the user to after download success
   * @param redirectToFailed - (optional) The URL to redirect the user to after download failure
   *
   * @returns The download URL to redirect the user to
   */
  async getDownloadLink(
    repository: string,
    branch?: string,
    ref?: string,
    path?: string,
    redirectToSuccess?: string,
    redirectToFailed?: string
  ): Promise<string> {
    try {
      // Construct the query parameters from the props
      const urlParams = new URLSearchParams();
      urlParams.append('repository', repository);
      if (branch) urlParams.append('branch', branch);
      if (ref) urlParams.append('ref', ref);
      if (path) urlParams.append('path', path);
      if (redirectToSuccess) urlParams.append('onSuccess', redirectToSuccess);
      if (redirectToFailed) urlParams.append('onFailed', redirectToFailed);

      // Construct the download URL
      const downloadUrl = `${this.irminCore.apiBase}/v1/repositories/${repository}/download?${urlParams.toString()}`;

      // Return the download URL
      return downloadUrl;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Repository Download link creation error'
      );
      throw error;
    }
  }

  /**
   * Upload a collection to the repository
   *
   * @todo Provide link to Irmin API docs
   *
   * Upload the files to the lakehouse, index them in the repository
   * and create a new collection.
   *
   * @param repository - The repository to upload the collection to
   * @param branch - The branch to upload the collection to
   * @param name - The name of the new collection
   * @param files - The files to upload
   * @param path - The path within the repository to upload the files to
   */
  async uploadCollection(
    repository: string,
    branch: string,
    name: string,
    files: FileList,
    path: string
  ): Promise<IrminAPIResponse> {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();

      formData.append('name', name);
      formData.append('branch', branch);
      formData.append('path', path);

      for (let i = 0; i < files.length; i++) {
        formData.append('files[]', files[i]);
      }

      const response = await this.irminCore.fetch(
        `/v1/repositories/${repository}/collection/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Upload Collection error');
      if (isDevelopment) return fake();
      throw error;
    }
  }

  /**
   * Delete a collection from the repository
   *
   * @todo Provide link to Irmin API docs
   *
   * @param repository - The repository to delete the collection from
   * @param branch - The branch to delete the collection from
   * @param collection - The collection to delete
   */
  async deleteCollection(
    repository: string,
    branch: string,
    collection: string
  ): Promise<IrminAPIResponse> {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();

      formData.append('_method', 'DELETE');
      formData.append('branch', branch);
      formData.append('collection', collection);

      const response = await this.irminCore.fetch(
        `/v1/repositories/${repository}/collection/delete`,
        {
          method: 'POST',
          body: formData,
        }
      );

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Delete Collection error');
      if (isDevelopment) return fake();
      throw error;
    }
  }
}

export default RepositoryService;
