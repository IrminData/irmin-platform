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
  tags?: string[];
}

/**
 * Interface for creating a pointer object
 */
interface CreatePointerRequest {
  target_workspace?: string;
  target_repository: string;
  target_path: string;
  target_ref: string;
}

/**
 * Response from creating a signed download URL
 */
interface CreateSignedURLResponse {
  url: string;
  expires_at: string;
}

/**
 * Response from generating a presigned upload URL
 */
interface PresignedUploadResult {
  upload_url: string;
  physical_address: string;
  expiry: number;
}

/**
 * Request body for associating a presigned upload
 */
interface AssociateUploadRequest {
  physical_address: string;
  checksum: string;
  size_bytes: number;
  content_type: string;
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
    this.downloadObjectRaw = this.downloadObjectRaw.bind(this);
    this.getObjectSchema = this.getObjectSchema.bind(this);
    this.uploadObject = this.uploadObject.bind(this);
    this.uploadObjectFromURL = this.uploadObjectFromURL.bind(this);
    this.moveObject = this.moveObject.bind(this);
    this.copyObject = this.copyObject.bind(this);
    this.deleteObject = this.deleteObject.bind(this);
    this.validateObject = this.validateObject.bind(this);
    this.createPointer = this.createPointer.bind(this);
    this.createSignedObjectURL = this.createSignedObjectURL.bind(this);
    this.createSignedRepositoryZipURL =
      this.createSignedRepositoryZipURL.bind(this);
    this.generatePresignedUploadURL =
      this.generatePresignedUploadURL.bind(this);
    this.associatePresignedUpload = this.associatePresignedUpload.bind(this);
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
    limitResponse,
  }: {
    workspace: string;
    repository: string;
    path: string;
    ref?: string;
    limitResponse?: boolean;
  }): Promise<IrminAPIBinaryResponse> {
    const urlParams = new URLSearchParams();
    urlParams.append('path', path);
    if (ref) urlParams.append('ref', ref);
    if (limitResponse) urlParams.append('limit-response', 'true');
    const url = `/v1/workspaces/${workspace}/repositories/${repository}/objects/content?${urlParams.toString()}`;
    return await this.irminCore.fetchBinary(url, { method: 'GET' }, [200]);
  }

  /**
   * Download the raw bytes of an object as a Blob. Uses `fetchRawBlob`
   * so `application/json` responses aren't parsed into JS values —
   * downloads need the original bytes, not a re-serialized object.
   *
   * The server routes through the size-tiered download path (in-memory,
   * stream, or presigned redirect), so arbitrarily large files work.
   * The inline-preview cap (`MAX_IN_MEMORY_SIZE_MB`) does NOT apply.
   *
   * @param props
   * @param props.workspace - The workspace slug.
   * @param props.repository - The repository slug.
   * @param props.path - The path of the object.
   * @param props.ref - The ref (branch, tag or commit hash).
   * @returns Blob with the raw object bytes.
   */
  async downloadObjectRaw({
    workspace,
    repository,
    path,
    ref,
  }: {
    workspace: string;
    repository: string;
    path: string;
    ref?: string;
  }): Promise<Blob> {
    const urlParams = new URLSearchParams();
    urlParams.append('path', path);
    if (ref) urlParams.append('ref', ref);
    const url = `/v1/workspaces/${workspace}/repositories/${repository}/objects/content?${urlParams.toString()}`;
    return await this.irminCore.fetchRawBlob(url, { method: 'GET' }, [200]);
  }

  /**
   * Get the structured content of an object.
   *
   * @param props
   * @param props.workspace - The workspace slug.
   * @param props.repository - The repository slug.
   * @param props.path - The path of the object.
   * @param props.ref - The ref (branch, tag or commit hash).
   * @param props.limitResponse - (optional) Limit response size for large files.
   * @returns IrminAPIResponse containing the structured content.
   */
  async getObjectStructuredContent({
    workspace,
    repository,
    path,
    ref,
    limitResponse,
  }: {
    workspace: string;
    repository: string;
    path: string;
    ref?: string;
    limitResponse?: boolean;
  }): Promise<IrminAPIResponse<JSONValue>> {
    try {
      const urlParams = new URLSearchParams();
      urlParams.append('path', path);
      if (ref) urlParams.append('ref', ref);
      if (limitResponse) urlParams.append('limit-response', 'true');
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
   * @param props.tags - (optional) The tags to attach to the object.
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
    tags,
  }: {
    workspace: string;
    repository: string;
    ref: string;
    path: string;
    metadata?: { [key: string]: string };
    tags?: string[];
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
      if (tags && tags.length > 0) {
        // Append tags as JSON string array
        formData.append('tags', JSON.stringify(tags));
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
   * @param props.tags - (optional) The tags to attach to the object.
   * @returns IrminAPIResponse containing the uploaded object.
   */
  async uploadObjectFromURL({
    workspace,
    repository,
    ref,
    path,
    fileURL,
    headers,
    tags,
  }: {
    workspace: string;
    repository: string;
    ref: string;
    path: string;
    fileURL: string;
    headers?: { [key: string]: string }; // e.g. { 'Authorization': 'Bearer <token>' }
    tags?: string[];
  }): Promise<IrminAPIResponse<RepositoryObject>> {
    try {
      const requestBody: UploadObjectFromURLRequest = {
        url: fileURL,
        headers,
        tags,
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

  /**
   * Validate an object against a schema.
   *
   * @param props - The object validation properties.
   * @param props.workspace - The workspace slug.
   * @param props.repository - The repository slug.
   * @param props.ref - The ref to perform the validation on.
   * @param props.path - The path of the object to validate.
   * @param props.validationSchema - The schema to validate against.
   * @param props.validationMode - The validation mode ('strict' or 'permissive').
   * @returns Validation result with valid flag, logs, and optional error.
   */
  async validateObject({
    workspace,
    repository,
    ref,
    path,
    validationSchema,
    validationMode,
  }: {
    workspace: string;
    repository: string;
    ref: string;
    path: string;
    validationSchema: ObjectSchema;
    validationMode: 'strict' | 'permissive';
  }): Promise<{ valid: boolean; logs: string[]; error?: string }> {
    try {
      const params = new URLSearchParams();
      params.append('ref', ref);
      params.append('path', path);

      const requestBody = {
        validation_schema: validationSchema,
        validation_mode: validationMode,
      };

      const url = `/v1/workspaces/${workspace}/repositories/${repository}/objects/validate?${params.toString()}`;

      const response = (await this.irminCore.fetchAPI(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })) as IrminAPIResponse<{
        valid: boolean;
        logs: string[];
        error?: string;
      }>;

      if (!response.data) {
        throw new Error('No validation data returned');
      }

      return response.data;
    } catch (error) {
      console.error((error as Error).message, 'Validate object error');
      throw error;
    }
  }

  /**
   * Create a pointer to an object in another repository.
   *
   * @param props - The pointer creation properties.
   * @param props.workspace - The workspace slug.
   * @param props.repository - The repository slug where the pointer will be created.
   * @param props.ref - The ref (branch) to create the pointer on.
   * @param props.path - The path for the pointer file.
   * @param props.targetRepository - The slug of the target repository.
   * @param props.targetPath - The path to the target object.
   * @param props.targetRef - The branch/commit of the target object.
   * @param props.targetWorkspace - (optional) The target workspace slug. Empty for same workspace.
   * @returns IrminAPIResponse containing the created pointer object.
   */
  async createPointer({
    workspace,
    repository,
    ref,
    path,
    targetRepository,
    targetPath,
    targetRef,
    targetWorkspace = '',
  }: {
    workspace: string;
    repository: string;
    ref: string;
    path: string;
    targetRepository: string;
    targetPath: string;
    targetRef: string;
    targetWorkspace?: string;
  }): Promise<IrminAPIResponse<RepositoryObject>> {
    try {
      const params = new URLSearchParams();
      params.append('ref', ref);
      params.append('path', path);

      const requestBody: CreatePointerRequest = {
        target_workspace: targetWorkspace,
        target_repository: targetRepository,
        target_path: targetPath,
        target_ref: targetRef,
      };

      const url = `/v1/workspaces/${workspace}/repositories/${repository}/objects/pointer?${params.toString()}`;

      const response = (await this.irminCore.fetchAPI(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })) as IrminAPIResponse<RepositoryObject>;

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Create pointer error');
      throw error;
    }
  }

  /**
   * Create a signed download URL for a repository object.
   *
   * @param props - The signed URL creation properties.
   * @param props.workspace - The workspace slug.
   * @param props.repository - The repository slug.
   * @param props.path - The path of the object.
   * @param props.ref - (optional) The ref (branch, tag or commit hash).
   * @param props.expiresInHours - (optional) How many hours the link is valid (default 24, max 168).
   * @returns IrminAPIResponse containing the signed URL and expiry.
   */
  async createSignedObjectURL({
    workspace,
    repository,
    path,
    ref,
    expiresInHours,
  }: {
    workspace: string;
    repository: string;
    path: string;
    ref?: string;
    expiresInHours?: number;
  }): Promise<IrminAPIResponse<CreateSignedURLResponse>> {
    try {
      const requestBody: {
        path: string;
        ref?: string;
        expires_in_hours?: number;
      } = { path };
      if (ref) requestBody.ref = ref;
      if (expiresInHours != null) requestBody.expires_in_hours = expiresInHours;

      const url = `/v1/workspaces/${workspace}/repositories/${repository}/objects/signed-url`;

      const response = (await this.irminCore.fetchAPI(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })) as IrminAPIResponse<CreateSignedURLResponse>;

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Create signed object URL error');
      throw error;
    }
  }

  /**
   * Create a signed download URL for an entire repository as a zip file.
   *
   * @param props - The signed zip URL creation properties.
   * @param props.workspace - The workspace slug.
   * @param props.repository - The repository slug.
   * @param props.ref - (optional) The ref (branch, tag or commit hash).
   * @param props.expiresInHours - (optional) How many hours the link is valid (default 24, max 168).
   * @returns IrminAPIResponse containing the signed URL and expiry.
   */
  async createSignedRepositoryZipURL({
    workspace,
    repository,
    ref,
    expiresInHours,
  }: {
    workspace: string;
    repository: string;
    ref?: string;
    expiresInHours?: number;
  }): Promise<IrminAPIResponse<CreateSignedURLResponse>> {
    try {
      const requestBody: {
        ref?: string;
        expires_in_hours?: number;
      } = {};
      if (ref) requestBody.ref = ref;
      if (expiresInHours != null) requestBody.expires_in_hours = expiresInHours;

      const url = `/v1/workspaces/${workspace}/repositories/${repository}/signed-zip-url`;

      const response = (await this.irminCore.fetchAPI(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })) as IrminAPIResponse<CreateSignedURLResponse>;

      return response;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Create signed repository zip URL error'
      );
      throw error;
    }
  }

  /**
   * Generate a presigned URL for direct-to-storage upload.
   * The client uploads directly to the storage backend using the returned URL,
   * then calls associatePresignedUpload to link the object.
   *
   * @param props - The presigned upload properties.
   * @param props.workspace - The workspace slug.
   * @param props.repository - The repository slug.
   * @param props.ref - The branch to upload to.
   * @param props.path - The object path within the repository.
   * @returns IrminAPIResponse containing the presigned upload URL and metadata.
   */
  async generatePresignedUploadURL({
    workspace,
    repository,
    ref,
    path,
  }: {
    workspace: string;
    repository: string;
    ref: string;
    path: string;
  }): Promise<IrminAPIResponse<PresignedUploadResult>> {
    try {
      const params = new URLSearchParams();
      params.append('ref', ref);
      params.append('path', path);
      const url = `/v1/workspaces/${workspace}/repositories/${repository}/objects/upload/presigned?${params.toString()}`;
      const response = (await this.irminCore.fetchAPI(url, {
        method: 'POST',
      })) as IrminAPIResponse<PresignedUploadResult>;
      return response;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Generate presigned upload URL error'
      );
      throw error;
    }
  }

  /**
   * Associate a previously staged upload with a path in the repository.
   * Call this after the client has uploaded the file directly to the presigned URL.
   *
   * @param props - The associate upload properties.
   * @param props.workspace - The workspace slug.
   * @param props.repository - The repository slug.
   * @param props.ref - The branch to associate the upload with.
   * @param props.path - The object path within the repository.
   * @param props.physicalAddress - The physical address returned from generatePresignedUploadURL.
   * @param props.checksum - The checksum of the uploaded file.
   * @param props.sizeBytes - The size of the uploaded file in bytes.
   * @param props.contentType - The MIME type of the uploaded file.
   * @returns IrminAPIResponse containing the associated object.
   */
  async associatePresignedUpload({
    workspace,
    repository,
    ref,
    path,
    physicalAddress,
    checksum,
    sizeBytes,
    contentType,
  }: {
    workspace: string;
    repository: string;
    ref: string;
    path: string;
    physicalAddress: string;
    checksum: string;
    sizeBytes: number;
    contentType: string;
  }): Promise<IrminAPIResponse<RepositoryObject>> {
    try {
      const params = new URLSearchParams();
      params.append('ref', ref);
      params.append('path', path);

      const requestBody: AssociateUploadRequest = {
        physical_address: physicalAddress,
        checksum,
        size_bytes: sizeBytes,
        content_type: contentType,
      };

      const url = `/v1/workspaces/${workspace}/repositories/${repository}/objects/upload/associate?${params.toString()}`;
      const response = (await this.irminCore.fetchAPI(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })) as IrminAPIResponse<RepositoryObject>;
      return response;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Associate presigned upload error'
      );
      throw error;
    }
  }
}

export default ObjectService;
