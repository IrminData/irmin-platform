import IrminCore from '@/lib/core';

import fake from '@/utils/prepareFakeResponse';

import { Connector } from '@/types/core/Connector';
import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { exampleConnectors } from '@/types/examples/core';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment = process.env.NODE_ENV === 'development';

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
  private irminCore: IrminCore;

  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.fetchAllConnectors = this.fetchAllConnectors.bind(this);
  }

  /**
   * Fetch all available connectors
   *
   * @returns avalable connectors
   */
  async fetchAllConnectors(): Promise<ConnectorAPIResponse> {
    if (isOfflineMode) return fake(exampleConnectors) as ConnectorAPIResponse;
    try {
      const response = (await this.irminCore.fetch(`/v1/connectors`, {
        method: 'GET',
      })) as ConnectorAPIResponse;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch connectors error');
      if (isDevelopment) return fake(exampleConnectors) as ConnectorAPIResponse;
      throw error;
    }
  }
}

export default ConnectorService;
