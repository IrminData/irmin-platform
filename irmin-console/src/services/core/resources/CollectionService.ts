import IrminCore from '@/services/core/IrminCore';

import fake from '@/utils/prepareFakeResponse';

import { Collection } from '@/types/core/Collection';
import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { exampleCollections } from '@/types/examples/core';

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
      const response = (await this.irminCore.fetch(
        `/v1/collections${repository ? `?repository=${repository}` : ''}`,
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
}

export default CollectionService;
