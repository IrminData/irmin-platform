import IrminCore from '@/lib/core';

import fake from '@/utils/prepareFakeResponse';

import { Commit } from '@/types/core/Commit';
import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { exampleCommits } from '@/types/examples/core';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Commit API service
 *
 * Provides methods to interact with repository commit endpoints.
 */
class CommitService {
  private irminCore: IrminCore;

  /**
   * Create a new CommitService.
   *
   * @param irminCore - The IrminCore instance for API calls.
   */
  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.fetchCommits = this.fetchCommits.bind(this);
    this.fetchCommit = this.fetchCommit.bind(this);
    this.createCommit = this.createCommit.bind(this);
    this.revertUncommittedChanges = this.revertUncommittedChanges.bind(this);
  }

  /**
   * Fetch all commits for a repository.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace identifier.
   * @param props.repository - The repository slug.
   * @param props.ref - (Optional) The branch or tag reference.
   * @returns IrminAPIResponse containing an array of Commit.
   */
  async fetchCommits({
    workspace,
    repository,
    ref,
  }: {
    workspace: string;
    repository: string;
    ref?: string;
  }): Promise<IrminAPIResponse<Commit[]>> {
    if (isOfflineMode)
      return fake(exampleCommits) as IrminAPIResponse<Commit[]>;
    try {
      const urlParams = new URLSearchParams();
      if (ref) urlParams.append('ref', ref);
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/repositories/${repository}/commits?${urlParams.toString()}`,
        { method: 'GET' }
      )) as IrminAPIResponse<Commit[]>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch Commits error');
      if (isDevelopment)
        return fake(exampleCommits) as IrminAPIResponse<Commit[]>;
      throw error;
    }
  }

  /**
   * Fetch a commit by hash.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace identifier.
   * @param props.repository - The repository slug.
   * @param props.hash - The commit hash.
   * @returns IrminAPIResponse containing the Commit.
   */
  async fetchCommit({
    workspace,
    repository,
    hash,
  }: {
    workspace: string;
    repository: string;
    hash: string;
  }): Promise<IrminAPIResponse<Commit>> {
    if (isOfflineMode)
      return fake(exampleCommits[0]) as IrminAPIResponse<Commit>;
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/repositories/${repository}/commits/${hash}`,
        { method: 'GET' }
      )) as IrminAPIResponse<Commit>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch Commit error');
      if (isDevelopment)
        return fake(exampleCommits[0]) as IrminAPIResponse<Commit>;
      throw error;
    }
  }

  /**
   * Create a new commit in a repository.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace identifier.
   * @param props.repository - The repository slug.
   * @param props.branch - The branch to create the commit in.
   * @param props.message - The commit message.
   * @returns IrminAPIResponse containing the new Commit.
   */
  async createCommit({
    workspace,
    repository,
    branch,
    message,
  }: {
    workspace: string;
    repository: string;
    branch: string;
    message: string;
  }): Promise<IrminAPIResponse<Commit>> {
    if (isOfflineMode)
      return fake(exampleCommits[0]) as IrminAPIResponse<Commit>;
    try {
      const formData = new FormData();
      formData.append('branch', branch);
      formData.append('message', message);

      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/repositories/${repository}/commits`,
        { method: 'POST', body: formData }
      )) as IrminAPIResponse<Commit>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Create Commit error');
      if (isDevelopment)
        return fake(exampleCommits[0]) as IrminAPIResponse<Commit>;
      throw error;
    }
  }

  /**
   * Revert uncommitted changes in a repository branch.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace identifier.
   * @param props.repository - The repository slug.
   * @param props.branch - The branch name.
   * @param props.path - The object path to revert.
   * @param props.pathType - The type of the path.
   * @returns IrminAPIResponse containing the result of the revert operation.
   */
  async revertUncommittedChanges({
    workspace,
    repository,
    branch,
    path,
    pathType,
  }: {
    workspace: string;
    repository: string;
    branch: string;
    path: string;
    pathType: string;
  }): Promise<IrminAPIResponse> {
    if (isOfflineMode) return fake() as IrminAPIResponse;
    try {
      const formData = new FormData();
      formData.append('branch', branch);
      formData.append('path', path);
      formData.append('path_type', pathType);

      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/repositories/${repository}/commits/revert`,
        { method: 'POST', body: formData }
      )) as IrminAPIResponse;
      return response;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Revert Uncommitted Changes error'
      );
      if (isDevelopment) return fake() as IrminAPIResponse;
      throw error;
    }
  }
}

export default CommitService;
