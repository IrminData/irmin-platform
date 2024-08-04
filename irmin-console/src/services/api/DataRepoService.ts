import { Locale } from '@/dictionaries';
import IrminAPI from '@/services/IrminAPI';

import { DataRepo } from '@/types/api/DataRepo';
import { IrminAPIResponse } from '@/types/api/IrminAPIResponse';
import { WorkspaceUser } from '@/types/api/Workspace';
import {
  exampleAPIResponse,
  exampleDataRepos,
} from '@/types/examples/apiObjects';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment =
  process.env.NEXT_PUBLIC_ENVIRONMENT_TYPE === 'development';

/**
 * Data repositories API response type (multiple)
 */
interface DataRepositoriesAPIResponse extends IrminAPIResponse {
  data: DataRepo[];
}

/**
 * Data repository API response type (single)
 */
interface DataRepositoryAPIResponse extends IrminAPIResponse {
  data: DataRepo;
}

/**
 * Data Repository API service
 *
 * Responsible for all Data Repository related API calls.
 */
class DataRepoService {
  private static instance: DataRepoService;
  private api: IrminAPI = IrminAPI.getInstance();

  private constructor(locale: Locale, apiToken: string) {
    this.api.setProps(locale, apiToken);
  }

  /**
   * Get the instance of the {@link DataRepoService}
   * @param locale - The locale to use for the instance
   * @param apiToken - The API token to use for the instance
   */
  public static getInstance(locale: Locale, apiToken: string): DataRepoService {
    if (!DataRepoService.instance) {
      DataRepoService.instance = new DataRepoService(locale, apiToken);
    } else {
      // Update the existing instance
      DataRepoService.instance.api.setProps(locale, apiToken);
    }
    return DataRepoService.instance;
  }

  /**
   * Fetch all available dataRepositories
   * @todo Provide link to Irmin API docs
   * @returns response from the API or example data
   */
  async fetchAllDataRepositories(): Promise<DataRepositoriesAPIResponse> {
    if (isOfflineMode) return { ...exampleAPIResponse, data: exampleDataRepos };
    try {
      const response = (await this.api.fetch(`/v1/data-repositories`, {
        method: 'GET',
      })) as DataRepositoriesAPIResponse;

      return response;
    } catch (error) {
      console.error('Fetch Data Repositories error:', error);
      if (isDevelopment)
        return { ...exampleAPIResponse, data: exampleDataRepos };
      throw error;
    }
  }

  /**
   * Create a new Data Repository
   *
   * @todo Provide link to Irmin API docs
   *
   * @param dataRepo - The Data Repository object to create
   *
   * @returns response from the API with data being the newly created Data Repository
   */
  async createDataRepo(dataRepo: DataRepo): Promise<DataRepositoryAPIResponse> {
    if (isOfflineMode)
      return {
        ...exampleAPIResponse,
        data: {
          ...exampleDataRepos[0],
          ...dataRepo,
        },
      };
    try {
      const formData = new FormData();

      formData.append('_method', 'PATCH');
      formData.append('name', dataRepo.name);
      formData.append('description', dataRepo.description ?? '');
      formData.append('documentation', dataRepo.documentation ?? '');
      dataRepo.tables.forEach((table: string) => {
        formData.append('tables', table);
      });

      const response = (await this.api.fetch(`/v1/data-repositories/create`, {
        method: 'POST',

        body: formData,
      })) as DataRepositoryAPIResponse;

      return response;
    } catch (error) {
      console.error('Create Data Repositories error:', error);
      if (isDevelopment)
        return {
          ...exampleAPIResponse,
          data: {
            ...exampleDataRepos[0],
            ...dataRepo,
          },
        };
      throw error;
    }
  }

  /**
   * Reassign the ownership of a Data Repository
   *
   * @todo Provide link to Irmin API docs
   *
   * @param dataRepo - The Data Repository to reassign
   * @param newOwner - The new owner of the Data Repository
   *
   * @returns response from the API
   */
  async reassignDataRepo(dataRepo: DataRepo, newOwner: WorkspaceUser) {
    if (isOfflineMode) return exampleAPIResponse;
    try {
      const formData = new FormData();
      formData.append('assignee', newOwner.id.toString());

      const response = await this.api.fetch(
        `/v1/data-repositories/${dataRepo.slug}/reassign`,
        {
          method: 'POST',

          body: formData,
        }
      );
      return response;
    } catch (error) {
      console.error('Reassign Data Repositories error:', error);
      if (isDevelopment) return exampleAPIResponse;
      throw error;
    }
  }

  /**
   * Delete a Data Repository
   *
   * @todo Provide link to Irmin API docs
   *
   * @param dataRepoSlug - The slug of the Data Repository to delete
   *
   * @returns response from the API
   */
  async deleteDataRepo(dataRepoSlug: string) {
    if (isOfflineMode) return exampleAPIResponse;
    try {
      const formData = new FormData();

      formData.append('_method', 'DELETE');

      const response = await this.api.fetch(
        `/v1/data-repositories/${dataRepoSlug}/delete`,
        {
          method: 'POST',

          body: formData,
        }
      );

      return response;
    } catch (error) {
      console.error('Delete Data Repository error:', error);
      if (isDevelopment) return exampleAPIResponse;
      throw error;
    }
  }

  /**
   * Update a Data Repository
   *
   * @todo Provide link to Irmin API docs
   *
   * @param dataRepoSlug - The slug of the Data Repository to update
   * @param updatedDataRepo - The updated Data Repository object
   *
   * @returns response from the API
   */
  async updateDataRepo(dataRepoSlug: string, updatedDataRepo: DataRepo) {
    if (isOfflineMode) return exampleAPIResponse;
    try {
      const formData = new FormData();

      formData.append('_method', 'PATCH');
      formData.append('name', updatedDataRepo.name);
      formData.append('description', updatedDataRepo.description ?? '');
      formData.append('documentation', updatedDataRepo.documentation ?? '');
      updatedDataRepo.tables.forEach((table: string) => {
        formData.append('tables', table);
      });

      const response = await this.api.fetch(
        `/v1/data-repositories/${dataRepoSlug}/update`,
        {
          method: 'POST',

          body: formData,
        }
      );

      return response;
    } catch (error) {
      console.error('Update Data Repository error:', error);
      if (isDevelopment) return exampleAPIResponse;
      throw error;
    }
  }
}

export default DataRepoService;
