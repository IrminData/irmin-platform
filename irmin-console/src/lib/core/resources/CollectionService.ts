import IrminCore from '@/lib/core';

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
const isDevelopment = process.env.NODE_ENV === 'development';

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
    this.uploadCollection = this.uploadCollection.bind(this);
    this.deleteCollection = this.deleteCollection.bind(this);
  }

  /**
   * Fetch all available collections for a repository and ref.
   *
   * If no repository is provided, fetch all collections.
   * If no ref is provided, fetch the collections from the default branch.
   *
   * @param repository - (optional) slug of the repository to fetch collections for
   * @param ref - (optional) ref to fetch the collections from, eg. branch, tag, commit hash
   */
  async fetchCollections(
    repository?: string,
    ref?: string
  ): Promise<CollectionsAPIResponse> {
    const examples = repository
      ? exampleCollections.filter(
          (collection) => collection.repository === repository
        )
      : exampleCollections;
    if (isOfflineMode) return fake(examples) as CollectionsAPIResponse;
    try {
      const urlParams = new URLSearchParams();
      if (repository) urlParams.append('repository', repository);
      if (ref) urlParams.append('ref', ref);
      const response = (await this.irminCore.fetchAPI(
        `/v1/collections?${urlParams.toString()}`,
        {
          method: 'GET',
        }
      )) as CollectionsAPIResponse;

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch Collections error');
      if (isDevelopment) return fake(examples) as CollectionsAPIResponse;
      throw error;
    }
  }

  /**
   * Fetch content as is. This content could be of a collection or a full repository.
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

  /**
   * Upload a collection to the repository
   *
   * Upload the files to the lakehouse, index them in the repository
   * and create a new collection.
   *
   * @param repository - The repository to upload the collection to
   * @param ref - The ref to upload the collection to (eg. branch)
   * @param name - The name of the new collection
   * @param files - The files to upload
   * @param path - The path within the repository to upload the files to
   */
  async uploadCollection(
    repository: string,
    ref: string,
    name: string,
    files: FileList,
    path: string
  ): Promise<IrminAPIResponse> {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();

      formData.append('name', name);
      formData.append('ref', ref);
      formData.append('path', path);

      for (let i = 0; i < files.length; i++) {
        formData.append('files[]', files[i]);
      }

      const response = await this.irminCore.fetchAPI(
        `/v1/repositories/${repository}/collection/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Upload Collection error');
      if (isDevelopment) return fake();
      throw error;
    }
  }

  /**
   * Delete a collection from the repository
   *
   * @param repository - The repository to delete the collection from
   * @param ref - The ref to delete the collection from
   * @param collection - Name of the collection to delete
   */
  async deleteCollection(
    repository: string,
    ref: string,
    collection: string
  ): Promise<IrminAPIResponse> {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();

      formData.append('_method', 'DELETE');
      formData.append('ref', ref);
      formData.append('collection', collection);

      const response = await this.irminCore.fetchAPI(
        `/v1/repositories/${repository}/collection/delete`,
        {
          method: 'POST',
          body: formData,
        }
      );

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Delete Collection error');
      if (isDevelopment) return fake();
      throw error;
    }
  }
}

export default CollectionService;
