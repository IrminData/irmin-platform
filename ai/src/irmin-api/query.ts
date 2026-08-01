import type IrminCore from '@/irmin-api';

import type { IrminAPIResponse } from '@/irmin-api/types/IrminAPIResponse';
import type { StoredQuery } from '@/irmin-api/types/StoredQuery';

/**
 * Query API service
 *
 * Responsible for all stored query related API calls.
 */
class QueryService {
  private irminCore: IrminCore;

  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    this.getStoredQuery = this.getStoredQuery.bind(this);
  }

  /**
   * Get a stored query by its ID.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.queryID - The stored query's ID.
   * @returns IrminAPIResponse containing the stored query.
   */
  async getStoredQuery({
    workspace,
    queryID,
  }: {
    workspace: string;
    queryID: string;
  }): Promise<IrminAPIResponse<StoredQuery>> {
    try {
      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/queries/${queryID}`,
        { method: 'GET' }
      );
      return response as IrminAPIResponse<StoredQuery>;
    } catch (error) {
      console.error((error as Error).message, 'Fetch stored query error');
      throw error;
    }
  }
}

export default QueryService;
