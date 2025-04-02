import IrminCore from '@/lib/core';

import fake from '@/utils/prepareFakeResponse';

import { Commit } from '@/types/core/Commit';
import {
  IrminAPIBinaryResponse,
  IrminAPIResponse,
} from '@/types/core/IrminAPIResponse';
import { Object as RepoObject } from '@/types/core/Object';
import { ObjectSchema } from '@/types/core/ObjectSchema';
import {
  exampleAPIBinaryResponse,
  exampleCommits,
  exampleObjects,
  exampleTableObjectSchema,
} from '@/types/examples/core';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Object API service
 *
 * Responsible for all repository object-related API calls.
 */
class ObjectService {
  private irminCore: IrminCore;

  /**
   * Create a new ObjectService.
   *
   * @param irminCore - The IrminCore instance for API calls.
   */
  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.getObjectAtPath = this.getObjectAtPath.bind(this);
    this.getObjectHistory = this.getObjectHistory.bind(this);
    this.getObjectSchema = this.getObjectSchema.bind(this);
    this.getObjectContent = this.getObjectContent.bind(this);
    this.uploadObject = this.uploadObject.bind(this);
    this.moveObject = this.moveObject.bind(this);
    this.copyObject = this.copyObject.bind(this);
    this.deleteObject = this.deleteObject.bind(this);
  }

  /**
   * Get an object at a given path.
   *
   * @param props - The object properties.
   * @param props.workspace - The workspace slug.
   * @param props.repository - The repository slug.
   * @param props.path - The path of the object.
   * @param props.ref - (optional) The ref (branch, tag or commit hash).
   * @returns IrminAPIResponse containing the object.
   */
  async getObjectAtPath({
    workspace,
    repository,
    path,
    ref,
  }: {
    workspace: string;
    repository: string;
    path: string;
    ref?: string;
  }): Promise<IrminAPIResponse<RepoObject>> {
    if (isOfflineMode)
      return fake(
        exampleObjects.find((obj) => obj.path === path) || exampleObjects[0]
      ) as IrminAPIResponse<RepoObject>;
    try {
      let url = `/v1/workspaces/${workspace}/repositories/${repository}/objects?&path=${encodeURIComponent(path)}`;
      if (ref) url += `ref=${encodeURIComponent(ref)}`;
      const response = (await this.irminCore.fetchAPI(url, {
        method: 'GET',
      })) as IrminAPIResponse<RepoObject>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch object error');
      if (isDevelopment)
        return fake(
          exampleObjects.find((obj) => obj.path === path) || exampleObjects[0]
        ) as IrminAPIResponse<RepoObject>;
      throw error;
    }
  }

  /**
   * Get the history of an object.
   *
   * @param props - The object history properties.
   * @param props.workspace - The workspace slug.
   * @param props.repository - The repository slug.
   * @param props.path - The path of the object.
   * @param props.ref - The ref (branch, tag or commit hash).
   * @returns IrminAPIResponse containing an array of commits.
   */
  async getObjectHistory({
    workspace,
    repository,
    path,
    ref,
  }: {
    workspace: string;
    repository: string;
    path: string;
    ref?: string;
  }): Promise<IrminAPIResponse<Commit[]>> {
    if (isOfflineMode)
      return fake(exampleCommits) as IrminAPIResponse<Commit[]>;
    try {
      let url = `/v1/workspaces/${workspace}/repositories/${repository}/objects/history?path=${encodeURIComponent(path)}`;
      if (ref) url += `&ref=${encodeURIComponent(ref)}`;
      const response = (await this.irminCore.fetchAPI(url, {
        method: 'GET',
      })) as IrminAPIResponse<Commit[]>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch object history error');
      if (isDevelopment)
        return fake(exampleCommits) as IrminAPIResponse<Commit[]>;
      throw error;
    }
  }

  /**
   * Get the schema of an object.
   *
   * @param props - The object schema properties.
   * @param props.workspace - The workspace slug.
   * @param props.repository - The repository slug.
   * @param props.path - The path of the object.
   * @param props.ref - The ref (branch, tag or commit hash).
   * @returns IrminAPIResponse containing the object schema.
   */
  async getObjectSchema({
    workspace,
    repository,
    path,
    ref,
  }: {
    workspace: string;
    repository: string;
    path: string;
    ref?: string;
  }): Promise<IrminAPIResponse<ObjectSchema>> {
    if (isOfflineMode)
      return fake(exampleTableObjectSchema) as IrminAPIResponse<ObjectSchema>;
    try {
      let url = `/v1/workspaces/${workspace}/repositories/${repository}/objects/schema?path=${encodeURIComponent(path)}`;
      if (ref) url += `&ref=${encodeURIComponent(ref)}`;
      const response = (await this.irminCore.fetchAPI(url, {
        method: 'GET',
      })) as IrminAPIResponse<ObjectSchema>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch object schema error');
      if (isDevelopment)
        return fake(exampleTableObjectSchema) as IrminAPIResponse<ObjectSchema>;
      throw error;
    }
  }

  /**
   * Get the content of an object.
   *
   * @param props - The object content properties.
   * @param props.workspace - The workspace slug.
   * @param props.repository - The repository slug.
   * @param props.path - The path of the object.
   * @param props.ref - The ref (branch, tag or commit hash).
   * @returns IrminAPIBinaryResponse containing the object content.
   */
  async getObjectContent({
    workspace,
    repository,
    path,
    ref,
  }: {
    workspace: string;
    repository: string;
    path: string;
    ref?: string;
  }): Promise<IrminAPIBinaryResponse> {
    if (isOfflineMode)
      return (await exampleAPIBinaryResponse(
        undefined,
        false
      )) as IrminAPIBinaryResponse;
    try {
      const urlParams = new URLSearchParams();
      urlParams.append('path', path);
      if (ref) urlParams.append('ref', ref);
      const url = `/v1/workspaces/${workspace}/repositories/${repository}/objects/content?${urlParams.toString()}`;
      const response = await this.irminCore.fetchBinary(url, { method: 'GET' });
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch object content error');
      if (isDevelopment)
        return (await exampleAPIBinaryResponse(
          undefined,
          false
        )) as IrminAPIBinaryResponse;
      throw error;
    }
  }

  /**
   * Upload an object.
   *
   * @param props - The object upload properties.
   * @param props.workspace - The workspace slug.
   * @param props.repository - The repository slug.
   * @param props.ref - The ref (branch, tag or commit hash) to upload to.
   * @param props.path - The path within the repository where the object will be uploaded.
   * @param props.name - The name of the object.
   * @param props.files - A FileList containing files to upload.
   * @returns IrminAPIResponse containing the uploaded object.
   */
  async uploadObject({
    workspace,
    repository,
    ref,
    path,
    files,
  }: {
    workspace: string;
    repository: string;
    ref: string;
    path: string;
    files?: FileList;
  }): Promise<IrminAPIResponse<RepoObject>> {
    if (isOfflineMode)
      return fake(
        exampleObjects.find((obj) => obj.path === path) || exampleObjects[0]
      ) as IrminAPIResponse<RepoObject>;
    try {
      const formData = new FormData();
      formData.append('ref', ref);
      // In the Go SDK, file uploads use in-memory bytes. Here we use FileList.
      if (files) {
        for (let i = 0; i < files.length; i++) {
          formData.append('file', files[i]);
        }
      }
      // Note: The Go endpoint does not use the object name in the URL; it uses query parameters.
      const url = `/v1/workspaces/${workspace}/repositories/${repository}/objects?ref=${encodeURIComponent(ref)}&path=${encodeURIComponent(path)}`;
      const response = (await this.irminCore.fetchAPI(url, {
        method: 'POST',
        body: formData,
      })) as IrminAPIResponse<RepoObject>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Upload object error');
      if (isDevelopment)
        return fake(
          exampleObjects.find((obj) => obj.path === path) || exampleObjects[0]
        ) as IrminAPIResponse<RepoObject>;
      throw error;
    }
  }

  /**
   * Move an object.
   *
   * @param props - The object move properties.
   * @param props.workspace - The workspace slug.
   * @param props.repository - The repository slug.
   * @param props.ref - The ref to perform the move on.
   * @param props.path - The current path of the object.
   * @param props.newPath - The new path for the object.
   * @returns IrminAPIResponse containing the moved object.
   */
  async moveObject({
    workspace,
    repository,
    ref,
    path,
    newPath,
  }: {
    workspace: string;
    repository: string;
    ref: string;
    path: string;
    newPath: string;
  }): Promise<IrminAPIResponse<RepoObject>> {
    if (isOfflineMode)
      return fake(
        exampleObjects.find((obj) => obj.path === path) || exampleObjects[0]
      ) as IrminAPIResponse<RepoObject>;
    try {
      const params = new URLSearchParams();
      params.append('ref', ref);
      params.append('path', path);
      params.append('new_path', newPath);
      const url = `/v1/workspaces/${workspace}/repositories/${repository}/objects/move?${params.toString()}`;
      const response = (await this.irminCore.fetchAPI(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })) as IrminAPIResponse<RepoObject>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Move object error');
      if (isDevelopment)
        return fake(
          exampleObjects.find((obj) => obj.path === path) || exampleObjects[0]
        ) as IrminAPIResponse<RepoObject>;
      throw error;
    }
  }

  /**
   * Copy an object.
   *
   * @param props - The object copy properties.
   * @param props.workspace - The workspace slug.
   * @param props.repository - The repository slug.
   * @param props.ref - The ref to perform the copy on.
   * @param props.path - The current path of the object.
   * @param props.newPath - The new path for the object.
   * @returns IrminAPIResponse containing the copied object.
   */
  async copyObject({
    workspace,
    repository,
    ref,
    path,
    newPath,
  }: {
    workspace: string;
    repository: string;
    ref: string;
    path: string;
    newPath: string;
  }): Promise<IrminAPIResponse<RepoObject>> {
    if (isOfflineMode)
      return fake(
        exampleObjects.find((obj) => obj.path === path) || exampleObjects[0]
      ) as IrminAPIResponse<RepoObject>;
    try {
      const params = new URLSearchParams();
      params.append('ref', ref);
      params.append('path', path);
      params.append('new_path', newPath);
      const url = `/v1/workspaces/${workspace}/repositories/${repository}/objects/copy?${params.toString()}`;
      const response = (await this.irminCore.fetchAPI(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })) as IrminAPIResponse<RepoObject>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Copy object error');
      if (isDevelopment)
        return fake(
          exampleObjects.find((obj) => obj.path === path) || exampleObjects[0]
        ) as IrminAPIResponse<RepoObject>;
      throw error;
    }
  }

  /**
   * Delete an object.
   *
   * @param props - The object delete properties.
   * @param props.workspace - The workspace slug.
   * @param props.repository - The repository slug.
   * @param props.ref - The ref to perform the delete on.
   * @param props.path - The path of the object to delete.
   * @returns IrminAPIResponse containing the deleted object.
   */
  async deleteObject({
    workspace,
    repository,
    ref,
    path,
  }: {
    workspace: string;
    repository: string;
    ref: string;
    path: string;
  }): Promise<IrminAPIResponse> {
    if (isOfflineMode) return fake() as IrminAPIResponse;
    try {
      const params = new URLSearchParams();
      params.append('ref', ref);
      params.append('path', path);
      const url = `/v1/workspaces/${workspace}/repositories/${repository}/objects?${params.toString()}`;
      const response = await this.irminCore.fetchAPI(url, { method: 'DELETE' });
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Delete object error');
      if (isDevelopment) return fake() as IrminAPIResponse;
      throw error;
    }
  }
}

export default ObjectService;
