import IrminCore from '@/services/core/IrminCore';

import fake from '@/utils/prepareFakeResponse';

import { IrminAPIResponse } from '@/types/api/IrminAPIResponse';
import { Repository } from '@/types/api/Repository';
import { WorkspaceUser } from '@/types/api/Workspace';
import { exampleRepositories } from '@/types/examples/base';

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
      repository.tables.forEach((table: string) => {
        formData.append('tables', table);
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
      updatedRepository.tables.forEach((table: string) => {
        formData.append('tables', table);
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
}

export default RepositoryService;
