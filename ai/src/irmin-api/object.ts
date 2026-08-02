import type IrminCore from '@/irmin-api';

import type { IrminAPIResponse } from '@/irmin-api/types/IrminAPIResponse';
import type { ObjectSchema } from '@/irmin-api/types/ObjectSchema';
import type { RepositoryObject } from '@/irmin-api/types/RepositoryObject';

/**
 * Object API service
 *
 * Responsible for all repository object-related API calls.
 */
class ObjectService {
  private irminCore: IrminCore;

  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    this.getObjectAtPath = this.getObjectAtPath.bind(this);
    this.getObjectSchema = this.getObjectSchema.bind(this);
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
      let url = `/v1/workspaces/${workspace}/repositories/${repository}/objects?path=${encodeURIComponent(path)}`;
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
}

export default ObjectService;
