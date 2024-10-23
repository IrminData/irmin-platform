import IrminCore from '@/lib/core';

import fake from '@/utils/prepareFakeResponse';

import { Commit } from '@/types/core/Commit';
import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { exampleCommits } from '@/types/examples/core';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Commits API response type
 */
interface CommitsAPIResponse extends IrminAPIResponse {
  data: Commit[];
}

/**
 * Commit API response type
 */
interface CommitAPIResponse extends IrminAPIResponse {
  data: Commit;
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
    this.fetchCommit = this.fetchCommit.bind(this);
    this.createCommit = this.createCommit.bind(this);
    this.revertUncommittedChanges = this.revertUncommittedChanges.bind(this);
    this.fetchLastModification = this.fetchLastModification.bind(this);
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
      if (ref) urlParams.append('ref', ref);
      const response = (await this.irminCore.fetchAPI(
        `/v1/repositories/${repository}/commits?${urlParams.toString()}`,
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
   * Fetch a commit by hash
   *
   * @param repository - The repository to get the commit from
   * @param hash - The hash of the commit to fetch
   */
  async fetchCommit(
    repository: string,
    hash: string
  ): Promise<CommitAPIResponse> {
    if (isOfflineMode) return fake(exampleCommits[0]) as CommitAPIResponse;
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/repositories/${repository}/commits/${hash}`,
        {
          method: 'GET',
        }
      )) as CommitAPIResponse;

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch Commit error');
      if (isDevelopment) return fake(exampleCommits[0]) as CommitAPIResponse;
      throw error;
    }
  }

  /**
   * Create a new commit in a repository using the uncommitted changes
   *
   * @param repository - The repository to commit to
   * @param branch - The branch to commit to
   * @param message - The commit message
   */
  async createCommit(
    repository: string,
    branch: string,
    message: string
  ): Promise<IrminAPIResponse> {
    if (isOfflineMode) return fake() as IrminAPIResponse;
    try {
      const formData = new FormData();
      formData.append('branch', branch);
      formData.append('message', message);

      const response = (await this.irminCore.fetchAPI(
        `/v1/repositories/${repository}/commits`,
        {
          method: 'POST',
          body: formData,
        }
      )) as IrminAPIResponse;

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
   * @param branch - The branch to revert changes in
   */
  async revertUncommittedChanges(
    repository: string,
    branch: string
  ): Promise<IrminAPIResponse> {
    if (isOfflineMode) return fake() as IrminAPIResponse;
    try {
      const formData = new FormData();
      formData.append('branch', branch);

      const response = (await this.irminCore.fetchAPI(
        `/v1/repositories/${repository}/commits/revert`,
        {
          method: 'POST',
          body: formData,
        }
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

  /**
   * Fetch the last commit which modified a collection in a repository
   *
   * @param repository - The slug of the repository the collection is in
   * @param branch - The branch the collection is on
   * @param collection - Name of the collection to fetch the last modification for
   */
  async fetchLastModification(
    repository: string,
    branch: string,
    collection: string
  ): Promise<CommitAPIResponse> {
    if (isOfflineMode) return fake(exampleCommits[0]) as CommitAPIResponse;
    try {
      const urlParams = new URLSearchParams();
      urlParams.append('branch', branch);
      const response = (await this.irminCore.fetchAPI(
        `/v1/repositories/${repository}/collections/${collection}/last-commit?${urlParams.toString()}`,
        {
          method: 'GET',
        }
      )) as CommitAPIResponse;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch Last Modification error');
      if (isDevelopment) return fake(exampleCommits[0]) as CommitAPIResponse;
      throw error;
    }
  }
}

export default CommitService;
