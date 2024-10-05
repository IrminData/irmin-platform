import IrminCore from '@/services/core/IrminCore';

import fake from '@/utils/prepareFakeResponse';

import { Commit } from '@/types/core/Commit';
import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { exampleCommits } from '@/types/examples/core';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment =
  process.env.NEXT_PUBLIC_ENVIRONMENT_TYPE === 'development';

/**
 * Commits API response type
 */
interface CommitsAPIResponse extends IrminAPIResponse {
  data: Commit[];
}

/**
 * Commit API service
 *
 * Responsible for all repository commit related API calls
 */
class CommitService {
  private irminCore: IrminCore;

  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.fetchCommits = this.fetchCommits.bind(this);
    this.createCommit = this.createCommit.bind(this);
    this.revertUncommittedChanges = this.revertUncommittedChanges.bind(this);
  }

  /**
   * Fetch all available commits for a repository and branch
   *
   * @param repository -  The repository to get commits from
   * @param ref - (optional) The ref to get commits from
   */
  async fetchCommits(
    repository: string,
    ref?: string
  ): Promise<CommitsAPIResponse> {
    if (isOfflineMode) return fake(exampleCommits) as CommitsAPIResponse;
    try {
      const urlParams = new URLSearchParams();
      urlParams.append('repository', repository);
      if (ref) urlParams.append('ref', ref);
      const response = (await this.irminCore.fetch(
        `/v1/commits?${urlParams.toString()}`,
        {
          method: 'GET',
        }
      )) as CommitsAPIResponse;

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch Commits error');
      if (isDevelopment) return fake(exampleCommits) as CommitsAPIResponse;
      throw error;
    }
  }

  /**
   * Create a new commit in a repository using the uncommitted changes
   *
   * @param repository - The repository to commit to
   * @param ref - The ref to commit to, eg. branch name
   * @param message - The commit message
   */
  async createCommit(
    repository: string,
    ref: string,
    message: string
  ): Promise<IrminAPIResponse> {
    if (isOfflineMode) return fake() as IrminAPIResponse;
    try {
      const response = (await this.irminCore.fetch(`/v1/commits`, {
        method: 'POST',
        body: JSON.stringify({
          repository,
          ref,
          message,
        }),
      })) as IrminAPIResponse;

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Create Commit error');
      if (isDevelopment) return fake() as IrminAPIResponse;
      throw error;
    }
  }

  /**
   * Revert uncommitted changes in a repository branch
   *
   * @param repository - The repository to revert changes in
   * @param ref - The ref to revert changes in, eg. branch name
   */
  async revertUncommittedChanges(
    repository: string,
    ref: string
  ): Promise<IrminAPIResponse> {
    if (isOfflineMode) return fake() as IrminAPIResponse;
    try {
      const response = (await this.irminCore.fetch(`/v1/commits/revert`, {
        method: 'POST',
        body: JSON.stringify({
          repository,
          ref,
        }),
      })) as IrminAPIResponse;

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
