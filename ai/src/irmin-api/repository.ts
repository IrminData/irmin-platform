import type IrminCore from '@/irmin-api';

import type { IrminAPIResponse } from '@/irmin-api/types/IrminAPIResponse';
import type { Repository } from '@/irmin-api/types/Repository';

/**
 * Repository API service
 *
 * Responsible for all Repository related API calls.
 */
class RepositoryService {
  private irminCore: IrminCore;

  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    this.fetchRepository = this.fetchRepository.bind(this);
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
}

export default RepositoryService;
