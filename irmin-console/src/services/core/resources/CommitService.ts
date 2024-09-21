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
  }

  /**
   * Fetch all available commits for a repository and branch
   * @todo Provide link to Irmin API docs
   *
   * @param repository - slug of the repository to fetch commits for
   * @param branch - branch to fetch commits for
   */
  async fetchCommits(
    repository: string,
    branch: string
  ): Promise<CommitsAPIResponse> {
    if (isOfflineMode) return fake(exampleCommits) as CommitsAPIResponse;
    try {
      const response = (await this.irminCore.fetch(
        `/v1/commits?repository=${repository}&branch=${branch}`,
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
}

export default CommitService;
