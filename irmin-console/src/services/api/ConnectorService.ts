import { Locale } from '@/dictionaries';
import IrminAPI from '@/services/IrminAPI';

import { Connector } from '@/types/api/Connector';
import { IrminAPIResponse } from '@/types/api/IrminAPIResponse';
import {
  exampleAPIResponse,
  exampleConnectors,
} from '@/types/examples/apiObjects';

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

  private static instance: ConnectorService;
  private api: IrminAPI = IrminAPI.getInstance();

  private constructor(locale: Locale, apiToken: string) {
    this.api.setProps(locale, apiToken);
  }

  /**
   * Get the instance of the {@link ConnectorService}
   * @param locale - The locale to use for the instance
   * @param apiToken - The API token to use for the instance
   */
  public static getInstance(
    locale: Locale,
    apiToken: string
  ): ConnectorService {
    if (!ConnectorService.instance) {
      ConnectorService.instance = new ConnectorService(locale, apiToken);
    } else {
      // Update the existing instance
      ConnectorService.instance.api.setProps(locale, apiToken);
    }
    return ConnectorService.instance;
  }

  /**
   * Fetch all available connectors
   * {@link https://api.irmin.dev/docs#connectors-GETv1-connectors | Irmin API docs}
   * @returns avalable connectors
   */
  async fetchAllConnectors(): Promise<ConnectorAPIResponse> {
    if (isOfflineMode)
      return { ...exampleAPIResponse, data: exampleConnectors };
    try {
      const response = (await this.api.fetch(`/v1/connectors`, {
        method: 'GET',
      })) as ConnectorAPIResponse;
      this.connectors = response.data;
      return response;
    } catch (error) {
      console.error('Fetch connectors error:', error);
      if (isDevelopment)
        return { ...exampleAPIResponse, data: exampleConnectors };
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
