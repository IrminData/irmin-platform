import IrminCore from '@/services/core/IrminCore';

import fake from '@/utils/prepareFakeResponse';

import { IrminFileType } from '@/types/core/Bucket';
import { Collection, CollectionData } from '@/types/core/Collection';
import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import {
  exampleFileCollectionData,
  exampleFolderCollectionData,
  exampleStreamCollectionData,
  exampleTableCollectionData,
} from '@/types/examples/core';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment =
  process.env.NEXT_PUBLIC_ENVIRONMENT_TYPE === 'development';

/**
 * Query API response type
 */
export interface QueryAPIResponse extends IrminAPIResponse {
  data: CollectionData;
  metadata: {
    itemsReturned: string; // Number of items returned
    executionTime: string; // Time taken to execute the script in milliseconds
    logs: string; // Logs from the script execution
    [key: string]: string;
  };
}

/**
 * Query API service
 *
 * Responsible for query related API calls
 */
class QueryService {
  private irminCore: IrminCore;

  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.runScript = this.runScript.bind(this);
  }
  /**
   * Execute a script
   * @todo Provide link to Irmin API docs
   *
   * The script can be either Irmin SQL query or a script to be executed in the Action Wrapper.
   *
   * Even if the script is invalid, the API will return a 200 status code. The response will contain the error messages.
   *
   * @param type - type of the script. Can be for example `sql`. See {@link IrminFileType}
   * @param content - content of the script
   * @param repository - (optional) The repository to run the script on
   * @param branch - (optional) The branch to run the script on
   * @param ref - (optional) The ref to run the script on
   * @param collection - (optional) collection to run the script on
   */
  async runScript(
    type: IrminFileType,
    content: string,
    repository?: string,
    branch?: string,
    ref?: string,
    collection?: Collection
  ): Promise<QueryAPIResponse> {
    if (isOfflineMode) {
      if (collection) {
        if (collection.type === 'table')
          return fake(exampleTableCollectionData) as QueryAPIResponse;
        if (collection.type === 'file')
          return fake(exampleFileCollectionData) as QueryAPIResponse;
        if (collection.type === 'folder')
          return fake(exampleFolderCollectionData) as QueryAPIResponse;
        if (collection.type === 'stream')
          return fake(exampleStreamCollectionData) as QueryAPIResponse;
      }
      return fake(exampleTableCollectionData) as QueryAPIResponse;
    }
    try {
      const body = new FormData();
      body.append('type', type);
      body.append('content', content);
      if (repository) body.append('repository', repository);
      if (branch) body.append('branch', branch);
      if (ref) body.append('ref', ref);
      if (collection) body.append('collection', collection.formatted_name);
      const response = (await this.irminCore.fetch(`/v1/api/query`, {
        method: 'POST',
        body,
      })) as QueryAPIResponse;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Run script error');
      if (isDevelopment)
        return fake(exampleTableCollectionData) as QueryAPIResponse;
      throw error;
    }
  }
}

export default QueryService;
