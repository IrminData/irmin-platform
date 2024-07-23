import {
  exampleAPIResponse,
  exampleConnector,
} from '@/lib/exampleObjects/apiObjects';
import { fetchWithCredentials } from '@/lib/fetchWithCredentials';

import { Connector } from '@/types/api/Connector';
import { IrminAPIResponse } from '@/types/api/IrminAPIResponse';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment =
  process.env.NEXT_PUBLIC_ENVIRONMENT_TYPE === 'development';

const api_base = process.env.NEXT_PUBLIC_API_URL;

interface ConnectorAPIResponse extends IrminAPIResponse {
  data: Connector[];
}

class ConnectorService {
  private connectors: Connector[] = [];

  private static instance: ConnectorService;
  private locale: string = 'en';

  private constructor(locale: string) {
    this.locale = locale;
  }

  public static getInstance(locale: string): ConnectorService {
    if (!ConnectorService.instance) {
      ConnectorService.instance = new ConnectorService(locale);
    } else {
      // Update the locale if the instance already exists
      ConnectorService.instance.setLocale(locale);
    }
    return ConnectorService.instance;
  }

  public setLocale(locale: string) {
    this.locale = locale;
  }

  /**
   * Fetch all available connectors
   * @returns {Promise<ConnectorAPIResponse>}
   * {@link https://api.irmin.dev/docs#connectors-GETv1-connectors Irmin API docs}
   */
  async fetchAllConnectors(): Promise<ConnectorAPIResponse> {
    if (isOfflineMode)
      return { ...exampleAPIResponse, data: [exampleConnector] };
    try {
      const response = (await fetchWithCredentials(
        `${api_base}/v1/connectors`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
        this.locale
      )) as ConnectorAPIResponse;
      this.connectors = response.data;
      return response;
    } catch (error) {
      console.error('Fetch connectors error:', error);
      if (isDevelopment)
        return { ...exampleAPIResponse, data: [exampleConnector] };
      throw error;
    }
  }

  /**
   * Get all connectors stored in the connectors array.
   * @returns {Connector[]}
   */
  getAllConnectors(): Connector[] {
    return this.connectors;
  }
}

export default ConnectorService;
