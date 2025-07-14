import type IrminCore from '@/lib/core';

import type { Branch } from '@/types/core/Branch';
import type { Diff } from '@/types/core/Diff';
import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

/**
 * Interface for creating a branch
 */
interface CreateBranchRequest {
  name: string;
  from: string;
  is_immutable?: boolean;
}

/**
 * Interface for updating a branch
 */
interface UpdateBranchRequest {
  name?: string;
  is_immutable?: boolean;
}

/**
 * Repository Branch API service
 *
 * Responsible for all repository branch related API calls
 */
class RepositoryBranchService {
  private irminCore: IrminCore;

  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.fetchBranches = this.fetchBranches.bind(this);
    this.fetchBranch = this.fetchBranch.bind(this);
    this.createBranch = this.createBranch.bind(this);
    this.deleteBranch = this.deleteBranch.bind(this);
    this.updateBranch = this.updateBranch.bind(this);
    this.getUncommittedChanges = this.getUncommittedChanges.bind(this);
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
   * @param props.isImmutable - Whether the branch should be immutable
   */
  async createBranch({
    workspace,
    repository,
    name,
    from,
    isImmutable,
  }: {
    workspace: string;
    repository: string;
    name: string;
    from: string;
    isImmutable?: boolean;
  }) {
    try {
      const requestBody: CreateBranchRequest = {
        name,
        from,
        is_immutable: isImmutable,
      };

      const res = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/repositories/${repository}/branches`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );
      return res;
    } catch (error) {
      console.error((error as Error).message, 'Failed to create branch');
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
   * @param props.isImmutable - Whether the branch should be immutable
   */
  async updateBranch({
    workspace,
    repository,
    branch,
    name,
    isImmutable,
  }: {
    workspace: string;
    repository: string;
    branch: string;
    name?: string;
    isImmutable?: boolean;
  }) {
    try {
      const requestBody: UpdateBranchRequest = {};

      if (name !== undefined) requestBody.name = name;
      if (isImmutable !== undefined) requestBody.is_immutable = isImmutable;

      const res = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/repositories/${repository}/branches/${branch}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );
      return res;
    } catch (error) {
      console.error((error as Error).message, 'Failed to update branch');
      throw error;
    }
  }

  /**
   * Get uncommitted changes in a branch
   *
   * @param props
   * @param props.workspace - The workspace to get the changes from
   * @param props.repository - The repository slug to get the changes from
   * @param props.branch - The branch name to get the changes from
   */
  async getUncommittedChanges({
    workspace,
    repository,
    branch,
  }: {
    workspace: string;
    repository: string;
    branch: string;
  }): Promise<IrminAPIResponse<Diff>> {
    try {
      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/repositories/${repository}/branches/${branch}/changes`,
        {
          method: 'GET',
        }
      );
      return response as IrminAPIResponse<Diff>;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Failed to get uncommitted changes'
      );
      throw error;
    }
  }
}

export default RepositoryBranchService;
