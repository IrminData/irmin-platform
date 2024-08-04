import { defaultLocale, Locale } from '@/dictionaries';
import { fetchWithCredentials } from '@/services/fetchWithCredentials';

import { Connector } from '@/types/api/Connector';
import { IrminAPIResponse } from '@/types/api/IrminAPIResponse';
import {
  exampleAPIResponse,
  exampleConnectors,
} from '@/types/examples/apiObjects';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment =
  process.env.NEXT_PUBLIC_ENVIRONMENT_TYPE === 'development';

const api_base = process.env.NEXT_PUBLIC_API_URL;

/**
 * Connector API response type
 * @internal
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
  private locale: Locale = defaultLocale;

  private constructor(locale: Locale) {
    this.locale = locale;
  }

  /**
   * Get the instance of the {@link ConnectorService}
   * @param locale - The locale to use for the instance
   */
  public static getInstance(locale: Locale): ConnectorService {
    if (!ConnectorService.instance) {
      ConnectorService.instance = new ConnectorService(locale);
    } else {
      // Update the locale if the instance already exists
      ConnectorService.instance.setLocale(locale);
    }
    return ConnectorService.instance;
  }

  /**
   * Set the locale for the instance
   * @param locale - The locale to set
   */
  public setLocale(locale: Locale) {
    this.locale = locale;
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
