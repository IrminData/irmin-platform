import IrminCore from '@/lib/core';

import fake from '@/utils/prepareFakeResponse';

import { Branch } from '@/types/core/Branch';
import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { exampleBranches } from '@/types/examples/core';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Branches API response type
 */
interface BranchesAPIResponse extends IrminAPIResponse {
  data: Branch[];
}

/**
 * Branches API response type
 */
interface BranchAPIResponse extends IrminAPIResponse {
  data: Branch;
}

/**
 * Branch API service
 *
 * Responsible for all repository branch related API calls
 */
class BranchService {
  private irminCore: IrminCore;

  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.fetchBranches = this.fetchBranches.bind(this);
    this.fetchBranch = this.fetchBranch.bind(this);
    this.createBranch = this.createBranch.bind(this);
    this.deleteBranch = this.deleteBranch.bind(this);
    this.updateBranch = this.updateBranch.bind(this);
  }

  /**
   * Fetch all available branches for a repository
   *
   * @param repository - slug of the repository to fetch branches for
   */
  async fetchBranches(repository: string): Promise<BranchesAPIResponse> {
    if (isOfflineMode) return fake(exampleBranches) as BranchesAPIResponse;
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/repositories/${repository}/branches`,
        {
          method: 'GET',
        }
      )) as BranchesAPIResponse;

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch Branches error');
      if (isDevelopment) return fake(exampleBranches) as BranchesAPIResponse;
      throw error;
    }
  }

  /**
   * Fetch a branch by name in a repository
   *
   * @param branch - The branch name to fetch
   * @param repository - The repository slug to fetch the branch from
   */
  async fetchBranch(
    branch: string,
    repository: string
  ): Promise<BranchAPIResponse> {
    if (isOfflineMode) return fake(exampleBranches[0]) as BranchAPIResponse;
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/repositories/${repository}/branches/${branch}`,
        {
          method: 'GET',
        }
      )) as BranchAPIResponse;

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch Branch error');
      if (isDevelopment) return fake(exampleBranches[0]) as BranchAPIResponse;
      throw error;
    }
  }

  /**
   * Delete a branch
   *
   * @param branch - The branch name to delete
   * @param repository - The repository slug to delete the branch from
   */
  async deleteBranch(branch: string, repository: string) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();

      formData.append('_method', 'DELETE');

      const response = await this.irminCore.fetchAPI(
        `/v1/repositories/${repository}/branches/${branch}`,
        {
          method: 'POST',
        }
      );

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Delete branch error');
      if (isDevelopment) return fake();
      throw error;
    }
  }

  /**
   * Create a new branch
   *
   * @param name - The name of the new branch
   * @param from - The branch to create the new branch from
   * @param repository - The repository slug to create the branch in
   */
  async createBranch(name: string, from: string, repository: string) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();

      formData.append('name', name);
      formData.append('from', from);

      const res = await this.irminCore.fetchAPI(
        `/v1/repositorories/${repository}/branches`,
        {
          method: 'POST',
          body: formData,
        }
      );
      return res;
    } catch (error) {
      console.error((error as Error).message, 'Failed to create branch');
      if (isDevelopment) return fake();
      throw error;
    }
  }

  /**
   * Update a branch
   *
   * @param branch - The branch to update
   * @param repository - The repository slug to update the branch in
   * @param name - The new name of the branch
   */
  async updateBranch(branch: string, repository: string, name: string) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();

      formData.append('_method', 'PATCH');
      formData.append('name', name);

      const res = await this.irminCore.fetchAPI(
        `/v1/repositories/${repository}/branches/${branch}`,
        {
          method: 'POST',
          body: formData,
        }
      );
      return res;
    } catch (error) {
      console.error((error as Error).message, 'Failed to update branch');
      if (isDevelopment) return fake();
      throw error;
    }
  }
}

export default BranchService;
