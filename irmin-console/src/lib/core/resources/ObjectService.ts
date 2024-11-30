import IrminCore from '@/lib/core';

import fake from '@/utils/prepareFakeResponse';

import {
  IrminAPIBinaryResponse,
  IrminAPIResponse,
} from '@/types/core/IrminAPIResponse';
import { Object } from '@/types/core/Object';
import { ObjectSchema } from '@/types/core/ObjectSchema';
import {
  exampleAPIBinaryResponse,
  exampleObjects,
  exampleObjectSchema,
} from '@/types/examples/core';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Get a fake object by its path or return the first object in the example objects list.
 */
function getFakeObject(path: string): Object {
  const object = exampleObjects.find((obj) => obj.path === path);
  if (!object) return exampleObjects[0];
  return object;
}

/**
 * Object API service
 *
 * Responsible for all repository object-related API calls
 */
class ObjectService {
  private irminCore: IrminCore;

  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.fetchObjects = this.fetchObjects.bind(this);
    this.fetchObject = this.fetchObject.bind(this);
    this.fetchObjectSchema = this.fetchObjectSchema.bind(this);
    this.fetchContent = this.fetchContent.bind(this);
    this.uploadObject = this.uploadObject.bind(this);
    this.moveObject = this.moveObject.bind(this);
    this.deleteObject = this.deleteObject.bind(this);
  }

  /**
   * Fetch objects at a given path in a repository and ref.
   *
   * @param repository - Repository slug to fetch objects for
   * @param path - Path in the repository to fetch objects from
   * @param ref - (optional) Ref to fetch objects from (branch, tag, or commit hash)
   */
  async fetchObjects(
    repository: string,
    path: string = '',
    ref?: string
  ): Promise<IrminAPIResponse<Object[]>> {
    if (isOfflineMode)
      return fake(exampleObjects) as IrminAPIResponse<Object[]>;
    try {
      const urlParams = new URLSearchParams();
      if (ref) urlParams.append('ref', ref);
      const response = (await this.irminCore.fetchAPI(
        `/v1/repositories/${repository}/objects/${path}?${urlParams.toString()}`,
        { method: 'GET' }
      )) as IrminAPIResponse<Object[]>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch Objects error');
      if (isDevelopment)
        return fake(exampleObjects) as IrminAPIResponse<Object[]>;
      throw error;
    }
  }

  /**
   * Fetch a single object by its name and path in a repository.
   *
   * @param repository - Repository slug
   * @param path - Full path of the object
   * @param ref - (optional) Ref to fetch the object at
   */
  async fetchObject(
    repository: string,
    path: string,
    ref?: string
  ): Promise<IrminAPIResponse<Object>> {
    if (isOfflineMode)
      return fake(getFakeObject(path)) as IrminAPIResponse<Object>;
    try {
      const urlParams = ref ? `?ref=${ref}` : '';
      const response = (await this.irminCore.fetchAPI(
        `/v1/repositories/${repository}/objects/${path}${urlParams}`,
        { method: 'GET' }
      )) as IrminAPIResponse<Object>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch Object error');
      if (isDevelopment)
        return fake(getFakeObject(path)) as IrminAPIResponse<Object>;
      throw error;
    }
  }

  /**
   * Fetch schema of an object in a repository.
   *
   * @param repository - Repository slug
   * @param path - Path of the object
   * @param ref - (optional) Ref to fetch schema at
   */
  async fetchObjectSchema(
    repository: string,
    path: string,
    ref?: string
  ): Promise<IrminAPIResponse<ObjectSchema>> {
    if (isOfflineMode)
      return fake(exampleObjectSchema) as IrminAPIResponse<ObjectSchema>;
    try {
      const urlParams = new URLSearchParams();
      if (ref) urlParams.append('ref', ref);
      const response = (await this.irminCore.fetchAPI(
        `/v1/repositories/${repository}/objects/schema/${path}?${urlParams.toString()}`,
        { method: 'GET' }
      )) as IrminAPIResponse<ObjectSchema>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch Object Schema error');
      if (isDevelopment)
        return fake(exampleObjectSchema) as IrminAPIResponse<ObjectSchema>;
      throw error;
    }
  }

  /**
   * Fetch the content of an object at a given path in the repository.
   *
   * @param repository - Repository slug
   * @param path - Path of the object
   * @param ref - (optional) Ref to fetch content at
   */
  async fetchContent(
    repository: string,
    path: string,
    ref?: string
  ): Promise<IrminAPIBinaryResponse> {
    if (isOfflineMode)
      return (await exampleAPIBinaryResponse()) as IrminAPIBinaryResponse;
    try {
      const urlParams = new URLSearchParams();
      if (ref) urlParams.append('ref', ref);
      const response = await this.irminCore.fetchBinary(
        `/v1/repositories/${repository}/objects/content/${path}?${urlParams.toString()}`,
        { method: 'GET' }
      );
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch Object Content error');
      if (isDevelopment)
        return (await exampleAPIBinaryResponse()) as IrminAPIBinaryResponse;
      throw error;
    }
  }

  /**
   * Upload or create a new object in the repository.
   *
   * @param repository - Repository slug
   * @param ref - Ref to upload the object to
   * @param path - Path within the repository
   * @param object - Name of the object
   * @param files - Files to upload
   */
  async uploadObject(
    repository: string,
    ref: string,
    path: string,
    object: string,
    files: FileList
  ): Promise<IrminAPIResponse<Object>> {
    if (isOfflineMode)
      return fake(getFakeObject(path)) as IrminAPIResponse<Object>;
    try {
      const formData = new FormData();
      formData.append('ref', ref);
      formData.append('path', path);
      formData.append('name', object);

      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }

      const response = (await this.irminCore.fetchAPI(
        `/v1/repositories/${repository}/objects/${path}/${object}`,
        { method: 'POST', body: formData }
      )) as IrminAPIResponse<Object>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Upload Object error');
      if (isDevelopment)
        return fake(getFakeObject(path)) as IrminAPIResponse<Object>;
      throw error;
    }
  }

  /**
   * Move or rename an object in the repository.
   *
   * @param repository - Repository slug
   * @param ref - Ref to move the object in
   * @param path - Current path of the object
   * @param newPath - New path for the object
   */
  async moveObject(
    repository: string,
    ref: string,
    path: string,
    newPath: string
  ): Promise<IrminAPIResponse<Object>> {
    if (isOfflineMode)
      return fake(getFakeObject(path)) as IrminAPIResponse<Object>;
    try {
      // Get object name from path and remove it from the path
      const object = path.split('/').pop();
      path = path.substring(0, path.lastIndexOf('/'));
      // Get new object name from new path and remove it from the new path
      const newObject = newPath.split('/').pop();
      newPath = newPath.substring(0, newPath.lastIndexOf('/'));

      const formData = new FormData();
      formData.append('_method', 'MOVE');
      formData.append('ref', ref);
      formData.append('new_name', newObject ?? '');
      formData.append('new_path', newPath);

      const response = (await this.irminCore.fetchAPI(
        `/v1/repositories/${repository}/objects/${path}/${object}`,
        { method: 'POST', body: formData }
      )) as IrminAPIResponse<Object>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Move Object error');
      if (isDevelopment)
        return fake(getFakeObject(path)) as IrminAPIResponse<Object>;
      throw error;
    }
  }

  /**
   * Delete an object from the repository.
   *
   * @param repository - Repository slug
   * @param ref - Ref to delete the object from
   * @param path - Path of the object
   * @param object - Name of the object to delete
   */
  async deleteObject(
    repository: string,
    ref: string,
    path: string,
    object: string
  ): Promise<IrminAPIResponse> {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();
      formData.append('_method', 'DELETE');
      formData.append('ref', ref);

      const response = await this.irminCore.fetchAPI(
        `/v1/repositories/${repository}/objects/${path}/${object}`,
        { method: 'POST', body: formData }
      );
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Delete Object error');
      if (isDevelopment) return fake();
      throw error;
    }
  }
}

export default ObjectService;
