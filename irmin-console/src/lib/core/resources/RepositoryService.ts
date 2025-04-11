import IrminCore from '@/lib/core';

import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { Repository } from '@/types/core/Repository';

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
    this.getRepositoryDownloadLink = this.getRepositoryDownloadLink.bind(this);
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
   * @param props.default_branch - Default branch for the repository.
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
    default_branch,
    isImmutable,
    garbageDefaultRetentionDays,
    garbageDefaultBranchRetentionDays,
  }: {
    workspace: string;
    name: string;
    description: string;
    documentation: string;
    default_branch: string;
    isImmutable: boolean;
    garbageDefaultRetentionDays?: number;
    garbageDefaultBranchRetentionDays?: number;
  }): Promise<IrminAPIResponse<Repository>> {
    try {
      const params = new URLSearchParams();
      params.append('name', name);
      params.append('description', description);
      params.append('documentation', documentation);
      params.append('default_branch', default_branch);
      params.append('is_immutable', isImmutable.toString());
      if (garbageDefaultRetentionDays)
        params.append(
          'garbage_default_retention_days',
          garbageDefaultRetentionDays.toString()
        );
      if (garbageDefaultBranchRetentionDays)
        params.append(
          'garbage_default_branch_retention_days',
          garbageDefaultBranchRetentionDays.toString()
        );
      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/repositories`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
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
      const params = new URLSearchParams();
      if (name) params.append('name', name);
      if (description) params.append('description', description);
      if (documentation) params.append('documentation', documentation);
      if (isImmutable !== undefined)
        params.append('is_immutable', isImmutable.toString());
      if (garbageDefaultRetentionDays !== undefined)
        params.append(
          'garbage_default_retention_days',
          garbageDefaultRetentionDays.toString()
        );
      if (garbageDefaultBranchRetentionDays !== undefined)
        params.append(
          'garbage_default_branch_retention_days',
          garbageDefaultBranchRetentionDays.toString()
        );
      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/repositories/${slug}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
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
      const params = new URLSearchParams();
      params.append('new_owner_id', newOwnerID);
      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/repositories/${slug}/transfer-ownership`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
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

  /**
   * Get a download link for a repository.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.repositorySlug - The repository slug.
   * @param props.ref - The ref to download.
   * @param props.path - The path to download.
   * @returns IrminAPIResponse containing an object with download_url.
   */
  async getRepositoryDownloadLink({
    workspace,
    repositorySlug,
    ref,
    path,
  }: {
    workspace: string;
    repositorySlug: string;
    ref: string;
    path: string;
  }): Promise<IrminAPIResponse<string>> {
    try {
      const formData = new FormData();
      formData.append('ref', ref);
      formData.append('path', path);
      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/repositories/${repositorySlug}/download`,
        {
          method: 'POST',
          body: formData,
        }
      );
      return response as IrminAPIResponse<string>;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Get Repository download link error'
      );
      throw error;
    }
  }
}

export default RepositoryService;
