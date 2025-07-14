import type IrminCore from '@/lib/core';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { Repository } from '@/types/core/Repository';

/**
 * Interface for creating a repository
 */
interface CreateRepositoryRequest {
  name: string;
  description?: string;
  documentation?: string;
  default_branch?: string;
  is_immutable?: boolean;
  garbage_default_retention_days?: number;
  garbage_default_branch_retention_days?: number;
}

/**
 * Interface for updating a repository
 */
interface UpdateRepositoryRequest {
  name?: string;
  description?: string;
  documentation?: string;
  is_immutable?: boolean;
  garbage_default_retention_days?: number;
  garbage_default_branch_retention_days?: number;
}

/**
 * Interface for transferring repository ownership
 */
interface TransferRepositoryOwnershipRequest {
  new_owner_id: string;
}

/**
 * Repository API service
 *
 * Responsible for all Repository related API calls.
 */
class RepositoryService {
  private irminCore: IrminCore;

  /**
   * Create a new RepositoryService.
   *
   * @param irminCore - The IrminCore instance for API calls.
   */
  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.fetchRepositories = this.fetchRepositories.bind(this);
    this.fetchRepository = this.fetchRepository.bind(this);
    this.createRepository = this.createRepository.bind(this);
    this.updateRepository = this.updateRepository.bind(this);
    this.transferRepository = this.transferRepository.bind(this);
    this.deleteRepository = this.deleteRepository.bind(this);
  }

  /**
   * Fetch all available repositories in a workspace.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @returns IrminAPIResponse containing an array of Repository.
   */
  async fetchRepositories({
    workspace,
  }: {
    workspace: string;
  }): Promise<IrminAPIResponse<Repository[]>> {
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/repositories`,
        { method: 'GET' }
      )) as IrminAPIResponse<Repository[]>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch Repositories error');
      throw error;
    }
  }

  /**
   * Fetch a repository by its slug.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.slug - The repository slug.
   * @returns IrminAPIResponse containing the Repository.
   */
  async fetchRepository({
    workspace,
    slug,
  }: {
    workspace: string;
    slug: string;
  }): Promise<IrminAPIResponse<Repository>> {
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/repositories/${slug}`,
        { method: 'GET' }
      )) as IrminAPIResponse<Repository>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch Repository error');
      throw error;
    }
  }

  /**
   * Create a new repository.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.name - Name of the repository.
   * @param props.description - Description of the repository.
   * @param props.documentation - Documentation for the repository.
   * @param props.defaultBranch - Default branch for the repository.
   * @param props.isImmutable - Whether the repository is immutable.
   * @param props.garbageDefaultRetentionDays - Garbage collection default retention days.
   * @param props.garbageDefaultBranchRetentionDays - Garbage collection default branch retention days.
   * @returns IrminAPIResponse containing the newly created Repository.
   */
  async createRepository({
    workspace,
    name,
    description,
    documentation,
    defaultBranch,
    isImmutable,
    garbageDefaultRetentionDays,
    garbageDefaultBranchRetentionDays,
  }: {
    workspace: string;
    name: string;
    description?: string;
    documentation?: string;
    defaultBranch?: string;
    isImmutable?: boolean;
    garbageDefaultRetentionDays?: number;
    garbageDefaultBranchRetentionDays?: number;
  }): Promise<IrminAPIResponse<Repository>> {
    try {
      const requestBody: CreateRepositoryRequest = {
        name,
        description,
        documentation,
        default_branch: defaultBranch,
        is_immutable: isImmutable,
        garbage_default_retention_days: garbageDefaultRetentionDays,
        garbage_default_branch_retention_days:
          garbageDefaultBranchRetentionDays,
      };

      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/repositories`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );
      return response as IrminAPIResponse<Repository>;
    } catch (error) {
      console.error((error as Error).message, 'Create Repository error');
      throw error;
    }
  }

  /**
   * Update an existing repository.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.slug - The repository slug.
   * @param props.name - New name of the repository.
   * @param props.description - New description.
   * @param props.documentation - New documentation.
   * @param props.isImmutable - Whether the repository is immutable.
   * @param props.garbageDefaultRetentionDays - Garbage collection default retention days.
   * @param props.garbageDefaultBranchRetentionDays - Garbage collection default branch retention days.
   * @returns IrminAPIResponse containing the updated Repository.
   */
  async updateRepository({
    workspace,
    slug,
    name,
    description,
    documentation,
    isImmutable,
    garbageDefaultRetentionDays,
    garbageDefaultBranchRetentionDays,
  }: {
    workspace: string;
    slug: string;
    name?: string;
    description?: string;
    documentation?: string;
    isImmutable?: boolean;
    garbageDefaultRetentionDays?: number;
    garbageDefaultBranchRetentionDays?: number;
  }): Promise<IrminAPIResponse<Repository>> {
    try {
      const requestBody: UpdateRepositoryRequest = {};

      if (name !== undefined) requestBody.name = name;
      if (description !== undefined) requestBody.description = description;
      if (documentation !== undefined)
        requestBody.documentation = documentation;
      if (isImmutable !== undefined) requestBody.is_immutable = isImmutable;
      if (garbageDefaultRetentionDays !== undefined)
        requestBody.garbage_default_retention_days =
          garbageDefaultRetentionDays;
      if (garbageDefaultBranchRetentionDays !== undefined)
        requestBody.garbage_default_branch_retention_days =
          garbageDefaultBranchRetentionDays;

      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/repositories/${slug}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );
      return response as IrminAPIResponse<Repository>;
    } catch (error) {
      console.error((error as Error).message, 'Update Repository error');
      throw error;
    }
  }

  /**
   * Transfer ownership of a repository.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.slug - The repository slug.
   * @param props.newOwnerID - The new owner's ID.
   * @returns IrminAPIResponse containing the repository with updated ownership.
   */
  async transferRepository({
    workspace,
    slug,
    newOwnerID,
  }: {
    workspace: string;
    slug: string;
    newOwnerID: string;
  }): Promise<IrminAPIResponse<Repository>> {
    try {
      const requestBody: TransferRepositoryOwnershipRequest = {
        new_owner_id: newOwnerID,
      };

      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/repositories/${slug}/transfer-ownership`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );
      return response as IrminAPIResponse<Repository>;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Repository ownership transfer error'
      );
      throw error;
    }
  }

  /**
   * Delete a repository.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.repositorySlug - The repository slug.
   * @returns IrminAPIResponse containing the deletion result.
   */
  async deleteRepository({
    workspace,
    repositorySlug,
  }: {
    workspace: string;
    repositorySlug: string;
  }): Promise<IrminAPIResponse> {
    try {
      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/repositories/${repositorySlug}`,
        { method: 'DELETE' }
      );
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Delete Repository error');
      throw error;
    }
  }
}

export default RepositoryService;
