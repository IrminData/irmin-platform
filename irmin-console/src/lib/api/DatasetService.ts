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

interface DatasetAPIResponse extends IrminAPIResponse {
  data: Dataset[];
}

class DatasetService {
  private datasets: Dataset[] = [];

  private static instance: DatasetService;
  private locale: string = 'en';

  private constructor(locale: string) {
    this.locale = locale;
  }

  public static getInstance(locale: string): DatasetService {
    if (!DatasetService.instance) {
      DatasetService.instance = new DatasetService(locale);
    } else {
      // Update the locale if the instance already exists
      DatasetService.instance.setLocale(locale);
    }
    return DatasetService.instance;
  }

  public setLocale(locale: string) {
    this.locale = locale;
  }

  /**
   * Fetch all available datasets
   * TODO: Provide link to Irmin API docs
   * @returns {Promise<DatasetAPIResponse>}
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
   * @returns {Dataset[]}
   */
  getAllDatasets(): Dataset[] {
    return this.datasets;
  }
}

export default DatasetService;
