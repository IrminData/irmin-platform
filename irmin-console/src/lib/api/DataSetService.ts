import { DataSet } from '@/types/DataSet';

export class DataSetService {
  private static instance: DataSetService;
  private baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ?? 'https://localhost:3000';
  private dataSets: DataSet[] = [];

  private constructor() {}

  // Get the singleton instance of the DataSetService class
  public static getInstance(): DataSetService {
    if (!DataSetService.instance) {
      DataSetService.instance = new DataSetService();
    }
    return DataSetService.instance;
  }

  /**
   * Fetch all datasets from the API and store them in the dataSets array.
   * @returns {Promise<DataSet[]>} - The fetched datasets.
   * @throws {Error} - If an error occurs while fetching the datasets.
   */
  async fetchAllDataSets(): Promise<DataSet[]> {
    try {
      // Fetch the datasets from the API
      const response = await fetch(`${this.baseUrl}/api/fake/data-sets`);
      if (!response.ok) {
        throw new Error(`Error fetching datasets: ${response.statusText}`);
      }
      const dataSets: DataSet[] = await response.json();
      this.dataSets = dataSets;
      return dataSets;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  /**
   * Fetch a dataset by ID from the API and update the corresponding dataset in the dataSets array.
   * @param {number} id - The ID of the dataset to fetch.
   * @returns {Promise<DataSet | null>} - The fetched dataset, or null if an error occurred.
   * @throws {Error} - If an error occurs while fetching the dataset.
   */
  async fetchDataSetById(id: number): Promise<DataSet | undefined> {
    try {
      // Check if the dataset is already stored in the dataSets array
      const stored = this.getDataSetById(id);
      if (stored) return stored;
      // Fetch the dataset from the API
      const response = await fetch(`${this.baseUrl}/api/fake/data-sets/${id}`);
      if (!response.ok) {
        throw new Error(
          `Error fetching dataset with ID ${id}: ${response.statusText}`
        );
      }
      const dataSet: DataSet = await response.json();
      this.dataSets = [...this.dataSets, dataSet];
      return dataSet;
    } catch (error) {
      console.error(error);
      return undefined;
    }
  }

  /**
   * Get all datasets stored in the dataSets array.
   * @returns {DataSet[]} - The stored datasets.
   */
  getAllDataSets(): DataSet[] {
    return this.dataSets;
  }

  /**
   * Get a dataset by ID from the dataSets array.
   * @param {number} id - The ID of the dataset to get.
   * @returns {DataSet | undefined} - The dataset with the specified ID, or undefined if not found.
   */
  getDataSetById(id: number): DataSet | undefined {
    return this.dataSets.find((dataSet) => dataSet.id === id);
  }
}
