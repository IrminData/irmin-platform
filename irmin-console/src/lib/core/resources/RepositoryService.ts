import IrminCore from '@/lib/core';

import fake from '@/utils/prepareFakeResponse';

import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { Repository } from '@/types/core/Repository';
import { exampleRepositories } from '@/types/examples/core';
import { ItemUpdateProps } from '@/types/internal/ItemUpdateProps';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment = process.env.NODE_ENV === 'development';

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
    this.fetchRepository = this.fetchRepository.bind(this);
    this.createRepository = this.createRepository.bind(this);
    this.reassignRepository = this.reassignRepository.bind(this);
    this.deleteRepository = this.deleteRepository.bind(this);
    this.updateRepository = this.updateRepository.bind(this);
  }

  /**
   * Fetch all available repositories
   */
  async fetchRepositories(): Promise<IrminAPIResponse<Repository[]>> {
    if (isOfflineMode)
      return fake(exampleRepositories) as IrminAPIResponse<Repository[]>;
    try {
      const response = (await this.irminCore.fetchAPI(`/v1/repositories`, {
        method: 'GET',
      })) as IrminAPIResponse<Repository[]>;

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch Repositories error');
      if (isDevelopment)
        return fake(exampleRepositories) as IrminAPIResponse<Repository[]>;
      throw error;
    }
  }

  /**
   * Fetch a repository by its slug
   */
  async fetchRepository(slug: string): Promise<IrminAPIResponse<Repository>> {
    if (isOfflineMode)
      return fake(exampleRepositories[0]) as IrminAPIResponse<Repository>;
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/repositories/${slug}`,
        {
          method: 'GET',
        }
      )) as IrminAPIResponse<Repository>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch Repository error');
      if (isDevelopment)
        return fake(exampleRepositories[0]) as IrminAPIResponse<Repository>;
      throw error;
    }
  }

  /**
   * Create a new Repository
   *
   * @param repository - The Repository object to create
   * @returns response from the API with data being the newly created Repository
   */
  async createRepository(
    repository: ItemUpdateProps
  ): Promise<IrminAPIResponse<Repository>> {
    if (isOfflineMode)
      return fake(exampleRepositories[0]) as IrminAPIResponse<Repository>;
    try {
      const formData = new FormData();

      formData.append('name', repository.name ?? '');
      formData.append('description', repository.description ?? '');
      formData.append('documentation', repository.documentation ?? '');

      const response = (await this.irminCore.fetchAPI(`/v1/repositories`, {
        method: 'POST',
        body: formData,
      })) as IrminAPIResponse<Repository>;

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Create Repositories error');
      if (isDevelopment)
        return fake(exampleRepositories[0]) as IrminAPIResponse<Repository>;
      throw error;
    }
  }

  /**
   * Reassign the ownership of a Repository
   *
   * @param repository - Slug of the Repository to reassign
   * @param newOwner - ID of the new owner of the Repository
   */
  async reassignRepository(repository: string, newOwner: string) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();
      formData.append('owner', newOwner);

      const response = await this.irminCore.fetchAPI(
        `/v1/repositories/${repository}/reassign`,
        {
          method: 'POST',
          body: formData,
        }
      );
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Reassign repository error');
      if (isDevelopment) return fake();
      throw error;
    }
  }

  /**
   * Delete a Repository
   *
   * @param repositorySlug - The slug of the Repository to delete
   */
  async deleteRepository(repositorySlug: string) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();
      formData.append('_method', 'DELETE');
      const response = await this.irminCore.fetchAPI(
        `/v1/repositories/${repositorySlug}`,
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
   * @param repositorySlug - The slug of the Repository to update
   * @param data - The updated Repository properties
   */
  async updateRepository(repositorySlug: string, data: ItemUpdateProps) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();
      formData.append('_method', 'PATCH');
      if (data.name) formData.append('name', data.name);
      if (data.description) formData.append('description', data.description);
      if (data.documentation)
        formData.append('documentation', data.documentation);

      const response = await this.irminCore.fetchAPI(
        `/v1/repositories/${repositorySlug}`,
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
