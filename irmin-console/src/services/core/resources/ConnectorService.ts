import IrminCore from '@/services/core/IrminCore';

import fake from '@/utils/prepareFakeResponse';

import { Connector } from '@/types/api/Connector';
import { IrminAPIResponse } from '@/types/api/IrminAPIResponse';
import { exampleConnectors } from '@/types/examples/base';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment =
  process.env.NEXT_PUBLIC_ENVIRONMENT_TYPE === 'development';

/**
 * Connector API response type
 */
interface ConnectorAPIResponse extends IrminAPIResponse {
  data: Connector[];
}

/**
 * Connector API service
 *
 * Responsible for all connector related API calls.
 */
class ConnectorService {
  private connectors: Connector[] = [];

  private irminCore: IrminCore;

  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.fetchAllConnectors = this.fetchAllConnectors.bind(this);
  }

  /**
   * Fetch all available connectors
   * {@link https://api.irmin.dev/docs#connectors-GETv1-connectors | Irmin API docs}
   * @returns avalable connectors
   */
  async fetchAllConnectors(): Promise<ConnectorAPIResponse> {
    if (isOfflineMode) return fake(exampleConnectors) as ConnectorAPIResponse;
    try {
      const response = (await this.irminCore.fetch(`/v1/connectors`, {
        method: 'GET',
      })) as ConnectorAPIResponse;
      this.connectors = response.data;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch connectors error');
      if (isDevelopment) return fake(exampleConnectors) as ConnectorAPIResponse;
      throw error;
    }
  }

  /**
   * Get all connectors stored in the connectors array.
   * @returns all stored connectors, empty if not fetched yet
   */
  getAllConnectors(): Connector[] {
    return this.connectors;
  }
}

export default ConnectorService;
