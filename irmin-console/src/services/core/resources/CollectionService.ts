import IrminCore from '@/services/core/IrminCore';

import fake from '@/utils/prepareFakeResponse';

import { Collection } from '@/types/core/Collection';
import {
  IrminAPIResponse,
  IrminAPIUnstructuredResponse,
} from '@/types/core/IrminAPIResponse';
import {
  exampleAPIUnstructuredResponse,
  exampleCollections,
} from '@/types/examples/core';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment =
  process.env.NEXT_PUBLIC_ENVIRONMENT_TYPE === 'development';

/**
 * Collections API response type
 */
interface CollectionsAPIResponse extends IrminAPIResponse {
  data: Collection[];
}

/**
 * Collection API service
 *
 * Responsible for all repository collection related API calls
 */
class CollectionService {
  private irminCore: IrminCore;

  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.fetchCollections = this.fetchCollections.bind(this);
    this.fetchCollectionContent = this.fetchCollectionContent.bind(this);
  }

  /**
   * Fetch all available collections for a repository or workspace
   * @todo Provide link to Irmin API docs
   *
   * @param repository - slug of the repository to fetch collections for. Leave empty to fetch all collections for the workspace
   */
  async fetchCollections(repository?: string): Promise<CollectionsAPIResponse> {
    if (isOfflineMode)
      return fake(exampleCollections) as CollectionsAPIResponse;
    try {
      const urlParams = new URLSearchParams();
      if (repository) urlParams.append('repository', repository);
      const response = (await this.irminCore.fetch(
        `/v1/collections?${urlParams.toString()}`,
        {
          method: 'GET',
        }
      )) as CollectionsAPIResponse;

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch Collections error');
      if (isDevelopment)
        return fake(exampleCollections) as CollectionsAPIResponse;
      throw error;
    }
  }

  /**
   * Fetch content of a specific collection
   * @todo Provide link to Irmin API docs
   *
   * @param collection - The ID of the collection to fetch
   * @param repository - (optional) The repository the collection is in
   * @param ref - (optional) The ref to fetch the collection from
   */
  async fetchCollectionContent(
    collection: number,
    repository?: string,
    ref?: string
  ): Promise<IrminAPIUnstructuredResponse> {
    if (isOfflineMode) return await exampleAPIUnstructuredResponse();
    try {
      // Construct the query parameters from the props
      const urlParams = new URLSearchParams();
      if (repository) urlParams.append('repository', repository);
      if (ref) urlParams.append('ref', ref);
      // Fetch the collection content from the API
      const response = await this.irminCore.fetchUnstructured(
        `/v1/collections/${collection}/content?${urlParams.toString()}`,
        {
          method: 'GET',
        }
      );
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch Collection Content error');
      if (isDevelopment) return await exampleAPIUnstructuredResponse();
      throw error;
    }
  }
}

export default CollectionService;
