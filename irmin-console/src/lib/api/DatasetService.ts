import { defaultLocale, Locale } from '@/dictionaries';
import {
  exampleAPIResponse,
  exampleDataset,
} from '@/lib/exampleObjects/apiObjects';
import { fetchWithCredentials } from '@/lib/fetchWithCredentials';

import { Dataset } from '@/types/api/Dataset';
import { IrminAPIResponse } from '@/types/api/IrminAPIResponse';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment =
  process.env.NEXT_PUBLIC_ENVIRONMENT_TYPE === 'development';
const api_base = process.env.NEXT_PUBLIC_API_URL;

/**
 * Dataset API response type
 * @internal
 */
interface DatasetAPIResponse extends IrminAPIResponse {
  data: Dataset[];
}

/**
 * Dataset API service
 *
 * @remarks
 *
 * This service calls the Irmin API and is responsible for all dataset related API calls.
 */
class DatasetService {
  private datasets: Dataset[] = [];

  private static instance: DatasetService;
  private locale: Locale = defaultLocale;

  private constructor(locale: Locale) {
    this.locale = locale;
  }

  /**
   * Get the instance of the {@link DatasetService}
   * @param locale - The locale to use for the instance
   */
  public static getInstance(locale: Locale): DatasetService {
    if (!DatasetService.instance) {
      DatasetService.instance = new DatasetService(locale);
    } else {
      // Update the locale if the instance already exists
      DatasetService.instance.setLocale(locale);
    }
    return DatasetService.instance;
  }

  /**
   * Set the locale for the service
   * @param locale - The locale to set
   */
  public setLocale(locale: Locale) {
    this.locale = locale;
  }

  /**
   * Fetch all available datasets
   * @todo Provide link to Irmin API docs
   * @returns response from the API or example data
   */
  async fetchAllDatasets(): Promise<DatasetAPIResponse> {
    if (isOfflineMode) return { ...exampleAPIResponse, data: [exampleDataset] };
    try {
      const response = (await fetchWithCredentials(
        `${api_base}/v1/datasets`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
        this.locale
      )) as DatasetAPIResponse;
      this.datasets = response.data;
      return response;
    } catch (error) {
      console.error('Fetch datasets error:', error);
      if (isDevelopment)
        return { ...exampleAPIResponse, data: [exampleDataset] };
      throw error;
    }
  }

  /**
   * Get all stored datasets
   * @returns all stored datasets, empty array if none
   */
  getAllDatasets(): Dataset[] {
    return this.datasets;
  }
}

export default DatasetService;
