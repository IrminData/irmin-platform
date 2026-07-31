import type IrminCore from '@/irmin-api';

import type { Connection } from '@/irmin-api/types/Connection';
import type { IrminAPIResponse } from '@/irmin-api/types/IrminAPIResponse';

/**
 * Connection API service
 *
 * Provides methods to interact with connection endpoints.
 */
class ConnectionService {
  private irminCore: IrminCore;

  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    this.fetchConnection = this.fetchConnection.bind(this);
  }

  /**
   * Fetch a connection by ID.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace to fetch the connection from.
   * @param props.connectionID - The ID of the connection to fetch.
   * @returns IrminAPIResponse containing the Connection.
   */
  async fetchConnection({
    workspace,
    connectionID,
  }: {
    workspace: string;
    connectionID: string;
  }): Promise<IrminAPIResponse<Connection>> {
    try {
      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/connections/${connectionID}`,
        { method: 'GET' }
      );
      return response as IrminAPIResponse<Connection>;
    } catch (error) {
      console.error((error as Error).message, 'Fetch connection error');
      throw error;
    }
  }
}

export default ConnectionService;
