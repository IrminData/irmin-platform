import type IrminCore from '@/lib/core';

import type { Commit } from '@/types/core/Commit';
import type {
  IrminAPIBinaryResponse,
  IrminAPIResponse,
} from '@/types/core/IrminAPIResponse';
import type { ObjectSchema } from '@/types/core/ObjectSchema';
import type { RepositoryObject } from '@/types/core/RepositoryObject';
import type { JSONValue } from '@/types/internal/GenericJSON';

/**
 * Interface for moving/copying repository objects
 */
interface MoveObjectRequest {
  new_path: string;
}

/**
 * Interface for uploading an object from a URL
 */
interface UploadObjectFromURLRequest {
  url: string;
  headers?: { [key: string]: string };
}

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
    this.getObjectContent = this.getObjectContent.bind(this);
    this.getObjectStructuredContent =
      this.getObjectStructuredContent.bind(this);
    this.downloadObjectZip = this.downloadObjectZip.bind(this);
    this.getObjectSchema = this.getObjectSchema.bind(this);
    this.uploadObject = this.uploadObject.bind(this);
    this.uploadObjectFromURL = this.uploadObjectFromURL.bind(this);
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
  }): Promise<IrminAPIResponse<RepositoryObject>> {
    try {
      let url = `/v1/workspaces/${workspace}/repositories/${repository}/objects?&path=${encodeURIComponent(path)}`;
      if (ref) url += `&ref=${encodeURIComponent(ref)}`;
      const response = (await this.irminCore.fetchAPI(url, {
        method: 'GET',
      })) as IrminAPIResponse<RepositoryObject>;
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
   * Get the content of an object.
   *
   * @param props
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
   * Get the structured content of an object.
   *
   * @param props
   * @param props.workspace - The workspace slug.
   * @param props.repository - The repository slug.
   * @param props.path - The path of the object.
   * @param props.ref - The ref (branch, tag or commit hash).
   * @returns IrminAPIResponse containing the structured content.
   */
  async getObjectStructuredContent({
    workspace,
    repository,
    path,
    ref,
  }: {
    workspace: string;
    repository: string;
    path: string;
    ref?: string;
  }): Promise<IrminAPIResponse<JSONValue>> {
    try {
      const urlParams = new URLSearchParams();
      urlParams.append('path', path);
      if (ref) urlParams.append('ref', ref);
      const url = `/v1/workspaces/${workspace}/repositories/${repository}/objects/content/structured?${urlParams.toString()}`;
      const response = (await this.irminCore.fetchAPI(url, {
        method: 'GET',
      })) as IrminAPIResponse<JSONValue>;
      return response;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Fetch object structured content error'
      );
      throw error;
    }
  }

  /**
   * Download an object as a zip file.
   *
   * @param props
   * @param props.workspace - The workspace slug.
   * @param props.repository - The repository slug.
   * @param props.path - The path of the object.
   * @param props.ref - The ref (branch, tag or commit hash).
   * @returns IrminAPIBinaryResponse containing the object zip file.
   */
  async downloadObjectZip({
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
      const url = `/v1/workspaces/${workspace}/repositories/${repository}/objects/download?${urlParams.toString()}`;
      const response = await this.irminCore.fetchBinary(
        url,
        { method: 'GET' },
        [200]
      );
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch object zip error');
    }
    return null;
  }

  /**
   * Get the schema of an object.
   *
   * @param props
   * @param props.workspace - The workspace slug.
   * @param props.repository - The repository slug.
   * @param props.path - The path of the object.
   * @param props.ref - The ref (branch, tag or commit hash).
   * @returns The schema of the object.
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
      const urlParams = new URLSearchParams();
      urlParams.append('path', path);
      if (ref) urlParams.append('ref', ref);
      const url = `/v1/workspaces/${workspace}/repositories/${repository}/objects/schema?${urlParams.toString()}`;
      const response = (await this.irminCore.fetchAPI(url, {
        method: 'GET',
      })) as IrminAPIResponse<ObjectSchema>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch object content error');
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
   * @param props.metadata - (optional) The metadata to attach to the object.
   * @param props.files - A FileList containing files to upload.
   * @returns IrminAPIResponse containing the uploaded object.
   */
  async uploadObject({
    workspace,
    repository,
    ref,
    path,
    files,
    metadata,
  }: {
    workspace: string;
    repository: string;
    ref: string;
    path: string;
    metadata?: { [key: string]: string };
    files?: FileList;
  }): Promise<IrminAPIResponse<RepositoryObject>> {
    try {
      const formData = new FormData();
      if (files) {
        for (let i = 0; i < files.length; i++) {
          formData.append('file', files[i]);
        }
      }
      if (metadata) {
        formData.append('metadata', JSON.stringify(metadata));
      }
      const url = `/v1/workspaces/${workspace}/repositories/${repository}/objects?ref=${encodeURIComponent(ref)}&path=${encodeURIComponent(path)}`;
      const response = (await this.irminCore.fetchAPI(url, {
        method: 'POST',
        body: formData,
      })) as IrminAPIResponse<RepositoryObject>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Upload object error');
      throw error;
    }
  }

  /**
   * Upload an object from a URL.
   *
   * @param props - The object upload properties.
   * @param props.workspace - The workspace slug.
   * @param props.repository - The repository slug.
   * @param props.ref - The ref (branch, tag or commit hash) to upload to.
   * @param props.path - The path within the repository where the object will be uploaded.
   * @param props.fileURL - The URL to upload the object from.
   * @param props.headers - (optional) The headers to pass to the URL. e.g. { 'Authorization': 'Bearer <token>' }
   * @returns IrminAPIResponse containing the uploaded object.
   */
  async uploadObjectFromURL({
    workspace,
    repository,
    ref,
    path,
    fileURL,
    headers,
  }: {
    workspace: string;
    repository: string;
    ref: string;
    path: string;
    fileURL: string;
    headers?: { [key: string]: string }; // e.g. { 'Authorization': 'Bearer <token>' }
  }): Promise<IrminAPIResponse<RepositoryObject>> {
    try {
      const requestBody: UploadObjectFromURLRequest = {
        url: fileURL,
        headers,
      };

      const urlParams = new URLSearchParams();
      urlParams.append('ref', ref);
      urlParams.append('path', path);
      const url = `/v1/workspaces/${workspace}/repositories/${repository}/objects/upload-from-url?${urlParams.toString()}`;
      const response = (await this.irminCore.fetchAPI(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })) as IrminAPIResponse<RepositoryObject>;

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Upload object from URL error');
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
  }): Promise<IrminAPIResponse<RepositoryObject>> {
    try {
      const params = new URLSearchParams();
      params.append('ref', ref);
      params.append('path', path);

      const requestBody: MoveObjectRequest = {
        new_path: newPath,
      };

      const url = `/v1/workspaces/${workspace}/repositories/${repository}/objects/move?${params.toString()}`;

      const response = (await this.irminCore.fetchAPI(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })) as IrminAPIResponse<RepositoryObject>;

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
  }): Promise<IrminAPIResponse<RepositoryObject>> {
    try {
      const params = new URLSearchParams();
      params.append('ref', ref);
      params.append('path', path);

      const requestBody: MoveObjectRequest = {
        new_path: newPath,
      };

      const url = `/v1/workspaces/${workspace}/repositories/${repository}/objects/copy?${params.toString()}`;

      const response = (await this.irminCore.fetchAPI(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })) as IrminAPIResponse<RepositoryObject>;

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
