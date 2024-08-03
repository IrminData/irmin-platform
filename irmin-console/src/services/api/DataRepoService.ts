import { defaultLocale, Locale } from '@/dictionaries';
import { fetchWithCredentials } from '@/services/fetchWithCredentials';

import { DataRepo } from '@/types/api/DataRepo';
import { IrminAPIResponse } from '@/types/api/IrminAPIResponse';
import {
  exampleAPIResponse,
  exampleDataset,
} from '@/types/examples/apiObjects';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment =
  process.env.NEXT_PUBLIC_ENVIRONMENT_TYPE === 'development';
const api_base = process.env.NEXT_PUBLIC_API_URL;

/**
 * DataRepo API response type
 * @internal
 */
interface DatasetAPIResponse extends IrminAPIResponse {
  data: DataRepo[];
}

/**
 * DataRepo API service
 *
 * Responsible for all dataRepo related API calls.
 */
class DataRepoService {
  private dataRepositories: DataRepo[] = [];

  private static instance: DataRepoService;
  private locale: Locale = defaultLocale;

  private constructor(locale: Locale) {
    this.locale = locale;
  }

  /**
   * Get the instance of the {@link DataRepoService}
   * @param locale - The locale to use for the instance
   */
  public static getInstance(locale: Locale): DataRepoService {
    if (!DataRepoService.instance) {
      DataRepoService.instance = new DataRepoService(locale);
    } else {
      // Update the locale if the instance already exists
      DataRepoService.instance.setLocale(locale);
    }
    return DataRepoService.instance;
  }

  /**
   * Set the locale for the service
   * @param locale - The locale to set
   */
  public setLocale(locale: Locale) {
    this.locale = locale;
  }

  /**
   * Fetch all available dataRepositories
   * @todo Provide link to Irmin API docs
   * @returns response from the API or example data
   */
  async fetchAllDataRepositories(): Promise<DatasetAPIResponse> {
    if (isOfflineMode) return { ...exampleAPIResponse, data: [exampleDataset] };
    try {
      const response = (await fetchWithCredentials(
        `${api_base}/v1/dataRepositories`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
        this.locale
      )) as DatasetAPIResponse;
      this.dataRepositories = response.data;
      return response;
    } catch (error) {
      console.error('Fetch dataRepositories error:', error);
      if (isDevelopment)
        return { ...exampleAPIResponse, data: [exampleDataset] };
      throw error;
    }
  }

  /**
   * Get all stored dataRepositories
   * @returns all stored dataRepositories, empty array if none
   */
  getAllDataRepositories(): DataRepo[] {
    return this.dataRepositories;
  }
}

export default DataRepoService;
