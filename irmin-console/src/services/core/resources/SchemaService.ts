import IrminCore from '@/services/core/IrminCore';

import fake from '@/utils/prepareFakeResponse';

import { RepositorySchema } from '@/types/core/Collection';
import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { exampleRepositorySchema } from '@/types/examples/core';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment =
  process.env.NEXT_PUBLIC_ENVIRONMENT_TYPE === 'development';

/**
 * Schema API response type
 */
interface SchemaAPIResponse extends IrminAPIResponse {
  data: RepositorySchema;
}

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
    this.fetchSchema = this.fetchSchema.bind(this);
  }
  /**
   * Fetch schema for a repository, workspace or specific collections
   * @todo Provide link to Irmin API docs
   *
   * @param collections - The collections to fetch schema for
   * @param repository - (optional) The repository to fetch schema for
   * @param ref - (optional) The ref to fetch schema for
   */
  async fetchSchema(
    collections: string[],
    repository?: string,
    ref?: string
  ): Promise<SchemaAPIResponse> {
    if (isOfflineMode)
      return fake(exampleRepositorySchema) as SchemaAPIResponse;
    try {
      const urlParams = new URLSearchParams();
      collections.forEach((collection) =>
        urlParams.append('collection', collection)
      );
      if (repository) urlParams.append('repository', repository);
      if (ref) urlParams.append('ref', ref);

      const response = (await this.irminCore.fetch(
        `/v1/api/schema?${urlParams.toString()}`,
        {
          method: 'GET',
        }
      )) as SchemaAPIResponse;

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch Schema error');
      if (isDevelopment)
        return fake(exampleRepositorySchema) as SchemaAPIResponse;
      throw error;
    }
  }
}

export default SchemaService;
