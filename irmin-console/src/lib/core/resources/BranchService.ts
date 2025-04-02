import IrminCore from '@/lib/core';

import fake from '@/utils/prepareFakeResponse';

import { Branch } from '@/types/core/Branch';
import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { exampleBranches } from '@/types/examples/core';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment = process.env.NODE_ENV === 'development';

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
   * @param props
   * @param props.workspace - The workspace to fetch the branches from
   * @param props.repository - The repository slug to fetch the branches from
   */
  async fetchBranches({
    workspace,
    repository,
  }: {
    workspace: string;
    repository: string;
  }): Promise<IrminAPIResponse<Branch[]>> {
    if (isOfflineMode)
      return fake(exampleBranches) as IrminAPIResponse<Branch[]>;
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/repositories/${repository}/branches`,
        {
          method: 'GET',
        }
      )) as IrminAPIResponse<Branch[]>;

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch Branches error');
      if (isDevelopment)
        return fake(exampleBranches) as IrminAPIResponse<Branch[]>;
      throw error;
    }
  }

  /**
   * Fetch a branch by name in a repository
   *
   * @param props
   * @param props.workspace - The workspace to fetch the branch from
   * @param props.repository - The repository slug to fetch the branch from
   * @param props.branch - The branch name to fetch
   */
  async fetchBranch({
    workspace,
    repository,
    branch,
  }: {
    workspace: string;
    repository: string;
    branch: string;
  }): Promise<IrminAPIResponse<Branch>> {
    if (isOfflineMode)
      return fake(exampleBranches[0]) as IrminAPIResponse<Branch>;
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/repositories/${repository}/branches/${branch}`,
        {
          method: 'GET',
        }
      )) as IrminAPIResponse<Branch>;

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch Branch error');
      if (isDevelopment)
        return fake(exampleBranches[0]) as IrminAPIResponse<Branch>;
      throw error;
    }
  }

  /**
   * Delete a branch
   *
   * @param props
   * @param props.workspace - The workspace to delete the branch from
   * @param props.repository - The repository slug to delete the branch from
   * @param props.branch - The branch name to delete
   */
  async deleteBranch({
    workspace,
    repository,
    branch,
  }: {
    workspace: string;
    repository: string;
    branch: string;
  }) {
    if (isOfflineMode) return fake();
    try {
      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/repositories/${repository}/branches/${branch}`,
        {
          method: 'DELETE',
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
   * @param props
   * @param props.workspace - The workspace to create the branch in
   * @param props.repository - The repository slug to create the branch in
   * @param props.name - The name of the new branch
   * @param props.from - The branch to create the new branch from
   */
  async createBranch({
    workspace,
    repository,
    name,
    from,
  }: {
    workspace: string;
    repository: string;
    name: string;
    from: string;
  }) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();

      formData.append('name', name);
      formData.append('from', from);

      const res = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/repositorories/${repository}/branches`,
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
   * @param props
   * @param props.workspace - The workspace to update the branch in
   * @param props.branch - The branch to update
   * @param props.repository - The repository slug to update the branch in
   * @param props.name - The new name of the branch
   */
  async updateBranch({
    workspace,
    repository,
    branch,
    name,
  }: {
    workspace: string;
    repository: string;
    branch: string;
    name: string;
  }) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();
      formData.append('name', name);

      const res = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/repositories/${repository}/branches/${branch}`,
        {
          method: 'PATCH',
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
