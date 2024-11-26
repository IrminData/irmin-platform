import IrminCore from '@/lib/core';

import fake from '@/utils/prepareFakeResponse';

import { RepositorySchema } from '@/types/core/Collection';
import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { exampleRepositorySchema } from '@/types/examples/core';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Schema API service
 *
 * Responsible for schema related API calls
 */
class SchemaService {
  private irminCore: IrminCore;

  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.fetchSchemas = this.fetchSchemas.bind(this);
  }
  /**
   * Fetch schema for a list of collections
   *
   * @param collections - The collections to fetch schema for
   * @param repository - The repository to fetch schema for
   * @param ref - The ref to fetch schema for
   */
  async fetchSchemas(
    collections: string[],
    repository: string,
    ref: string
  ): Promise<IrminAPIResponse<RepositorySchema>> {
    if (isOfflineMode)
      return fake(
        exampleRepositorySchema
      ) as IrminAPIResponse<RepositorySchema>;
    try {
      const urlParams = new URLSearchParams();
      collections.forEach((collection) =>
        urlParams.append('collection', collection)
      );
      urlParams.append('ref', ref);

      const response = (await this.irminCore.fetchAPI(
        `/v1/repositories/${repository}/schemas?${urlParams.toString()}`,
        {
          method: 'GET',
        }
      )) as IrminAPIResponse<RepositorySchema>;

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch Schema error');
      if (isDevelopment)
        return fake(
          exampleRepositorySchema
        ) as IrminAPIResponse<RepositorySchema>;
      throw error;
    }
  }
}

export default SchemaService;
