import IrminCore from '@/lib/core';

import { Commit } from '@/types/core/Commit';
import {
  IrminAPIBinaryResponse,
  IrminAPIResponse,
} from '@/types/core/IrminAPIResponse';
import { Object as RepoObject } from '@/types/core/Object';
import { ObjectSchema } from '@/types/core/ObjectSchema';

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
    try {
      let url = `/v1/workspaces/${workspace}/repositories/${repository}/objects?&path=${encodeURIComponent(path)}`;
      if (ref) url += `&ref=${encodeURIComponent(ref)}`;
      const response = (await this.irminCore.fetchAPI(url, {
        method: 'GET',
      })) as IrminAPIResponse<RepoObject>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch object error');
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
    try {
      let url = `/v1/workspaces/${workspace}/repositories/${repository}/objects/history?path=${encodeURIComponent(path)}`;
      if (ref) url += `&ref=${encodeURIComponent(ref)}`;
      const response = (await this.irminCore.fetchAPI(url, {
        method: 'GET',
      })) as IrminAPIResponse<Commit[]>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch object history error');
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
    try {
      let url = `/v1/workspaces/${workspace}/repositories/${repository}/objects/schema?path=${encodeURIComponent(path)}`;
      if (ref) url += `&ref=${encodeURIComponent(ref)}`;
      const response = (await this.irminCore.fetchAPI(url, {
        method: 'GET',
      })) as IrminAPIResponse<ObjectSchema>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch object schema error');
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
  }): Promise<IrminAPIBinaryResponse | null> {
    try {
      const urlParams = new URLSearchParams();
      urlParams.append('path', path);
      if (ref) urlParams.append('ref', ref);
      const url = `/v1/workspaces/${workspace}/repositories/${repository}/objects/content?${urlParams.toString()}`;
      const response = await this.irminCore.fetchBinary(
        url,
        { method: 'GET' },
        [200]
      );
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch object content error');
    }
    return null;
  }

  /**
   * Upload an object.
   *
   * @param props - The object upload properties.
   * @param props.workspace - The workspace slug.
   * @param props.repository - The repository slug.
   * @param props.ref - The ref (branch, tag or commit hash) to upload to.
   * @param props.path - The path within the repository where the object will be uploaded.
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
    try {
      const params = new URLSearchParams();
      params.append('ref', ref);
      params.append('path', path);

      const formData = new FormData();
      formData.append('new_path', newPath);

      const url = `/v1/workspaces/${workspace}/repositories/${repository}/objects/move?${params.toString()}`;

      const response = (await this.irminCore.fetchAPI(url, {
        method: 'POST',
        body: formData,
      })) as IrminAPIResponse<RepoObject>;

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Move object error');
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
    try {
      const params = new URLSearchParams();
      params.append('ref', ref);
      params.append('path', path);

      const formData = new FormData();
      formData.append('new_path', newPath);

      const url = `/v1/workspaces/${workspace}/repositories/${repository}/objects/copy?${params.toString()}`;

      const response = (await this.irminCore.fetchAPI(url, {
        method: 'POST',
        body: formData,
      })) as IrminAPIResponse<RepoObject>;

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Copy object error');
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
    try {
      const params = new URLSearchParams();
      params.append('ref', ref);
      params.append('path', path);
      const url = `/v1/workspaces/${workspace}/repositories/${repository}/objects?${params.toString()}`;
      const response = await this.irminCore.fetchAPI(url, { method: 'DELETE' });
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Delete object error');
      throw error;
    }
  }
}

export default ObjectService;
