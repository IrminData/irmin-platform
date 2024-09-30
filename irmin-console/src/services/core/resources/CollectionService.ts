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
    this.fetchContent = this.fetchContent.bind(this);
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
   * Fetch content as is. This content could be of a collection or a full repository.
   * @todo Provide link to Irmin API docs
   *
   * This should return the content at the given ref of the collection as
   * an unstructured response {@link IrminAPIUnstructuredResponse} eg. raw.
   *
   * For folders and full repositories, this should return the content as a zip file. If a path is provided,
   * return the content from that path as a zip file.
   *
   * @param params - Object containing the parameters for fetching the collection content
   * @param params.collection - (optional) The ID of the collection to fetch
   * @param params.path - (optional) The path in the collection to fetch, if the collection is a folder
   * @param params.repository - (optional) The repository the collection is in
   * @param params.ref - (optional) The ref to fetch the collection from
   */
  async fetchContent({
    collection,
    path,
    repository,
    ref,
  }: {
    collection?: string;
    path?: string;
    repository?: string;
    ref?: string;
  }): Promise<IrminAPIUnstructuredResponse> {
    if (isOfflineMode) return await exampleAPIUnstructuredResponse();
    try {
      // Construct the query parameters from the props
      const urlParams = new URLSearchParams();
      if (repository) urlParams.append('repository', repository);
      if (ref) urlParams.append('ref', ref);
      if (path) urlParams.append('path', path);
      if (collection) urlParams.append('collection', collection);
      // Fetch the collection content from the API
      const response = await this.irminCore.fetchUnstructured(
        `/v1/content?${urlParams.toString()}`,
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
