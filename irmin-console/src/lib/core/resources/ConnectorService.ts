import IrminCore from '@/lib/core';

import fake from '@/utils/prepareFakeResponse';

import { Connector } from '@/types/core/Connector';
import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { exampleConnectors } from '@/types/examples/core';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment = process.env.NODE_ENV === 'development';

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
  async fetchAllConnectors(): Promise<IrminAPIResponse<Connector[]>> {
    if (isOfflineMode)
      return fake(exampleConnectors) as IrminAPIResponse<Connector[]>;
    try {
      const response = (await this.irminCore.fetchAPI(`/v1/connectors`, {
        method: 'GET',
      })) as IrminAPIResponse<Connector[]>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch connectors error');
      if (isDevelopment)
        return fake(exampleConnectors) as IrminAPIResponse<Connector[]>;
      throw error;
    }
  }

  /**
   * Fetch a connector by id
   *
   * @param id - connector id
   * @returns connector
   */
  async fetchConnector(id: string): Promise<IrminAPIResponse<Connector>> {
    if (isOfflineMode)
      return fake(exampleConnectors[0]) as IrminAPIResponse<Connector>;
    try {
      const response = (await this.irminCore.fetchAPI(`/v1/connectors/${id}`, {
        method: 'GET',
      })) as IrminAPIResponse<Connector>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch connector error');
      if (isDevelopment)
        return fake(exampleConnectors[0]) as IrminAPIResponse<Connector>;
      throw error;
    }
  }
}

export default ConnectorService;
