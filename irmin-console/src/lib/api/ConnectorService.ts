import { defaultLocale, Locale } from '@/dictionaries';
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
 * @remarks
 *
 * This service calls the Irmin API and is responsible for all connector related API calls.
 *
 * Like the other API services, this service is a singleton, meaning that only one
 * instance of the service can exist at a time.
 *
 * The service uses the {@link fetchWithCredentials} function to make API calls.
 *
 * If the environment is set to offline mode, service will return example data instead
 * of making API calls.
 *
 * If the environment is set to development, service will log the API call errors to
 * the console, but will not throw them. Instead, it will return the example data.
 *
 * Example data can be found here: `@/lib/exampleObjects/apiObjects`
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
   * @returns avalable connectors
   * {@link https://api.irmin.dev/docs#connectors-GETv1-connectors | Irmin API docs}
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
   * @returns all stored connectors, empty if not fetched yet
   */
  getAllConnectors(): Connector[] {
    return this.connectors;
  }
}

export default ConnectorService;
