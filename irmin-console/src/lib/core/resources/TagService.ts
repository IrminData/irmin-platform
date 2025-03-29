import IrminCore from '@/lib/core';

import fake from '@/utils/prepareFakeResponse';

import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { Tag } from '@/types/core/Tag';
import { exampleTags } from '@/types/examples/core';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Tag API service
 *
 * Responsible for all repository tag related API calls.
 */
class TagService {
  private irminCore: IrminCore;

  /**
   * Create a new TagService.
   *
   * @param irminCore - The IrminCore instance for API calls.
   */
  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.fetchTags = this.fetchTags.bind(this);
    this.fetchTag = this.fetchTag.bind(this);
    this.createTag = this.createTag.bind(this);
    this.deleteTag = this.deleteTag.bind(this);
  }

  /**
   * Fetch all available tags for a repository.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.repository - The repository slug.
   * @returns IrminAPIResponse containing an array of Tag.
   */
  async fetchTags({
    workspace,
    repository,
  }: {
    workspace: string;
    repository: string;
  }): Promise<IrminAPIResponse<Tag[]>> {
    if (isOfflineMode) return fake(exampleTags) as IrminAPIResponse<Tag[]>;
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/repositories/${repository}/tags`,
        { method: 'GET' }
      )) as IrminAPIResponse<Tag[]>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch Tags error');
      if (isDevelopment) return fake(exampleTags) as IrminAPIResponse<Tag[]>;
      throw error;
    }
  }

  /**
   * Fetch a single tag.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.repository - The repository slug.
   * @param props.tag - The tag identifier.
   * @returns IrminAPIResponse containing the Tag.
   */
  async fetchTag({
    workspace,
    repository,
    tag,
  }: {
    workspace: string;
    repository: string;
    tag: string;
  }): Promise<IrminAPIResponse<Tag>> {
    if (isOfflineMode) return fake(exampleTags[0]) as IrminAPIResponse<Tag>;
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/repositories/${repository}/tags/${tag}`,
        { method: 'GET' }
      )) as IrminAPIResponse<Tag>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch Tag error');
      if (isDevelopment) return fake(exampleTags[0]) as IrminAPIResponse<Tag>;
      throw error;
    }
  }

  /**
   * Create a new tag.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.repository - The repository slug.
   * @param props.name - The name of the tag.
   * @param props.ref - The ref to create the tag from.
   * @returns IrminAPIResponse containing the created Tag.
   */
  async createTag({
    workspace,
    repository,
    name,
    ref,
  }: {
    workspace: string;
    repository: string;
    name: string;
    ref: string;
  }): Promise<IrminAPIResponse<Tag>> {
    if (isOfflineMode) return fake(exampleTags[0]) as IrminAPIResponse<Tag>;
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('ref', ref);
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/repositories/${repository}/tags`,
        {
          method: 'POST',
          body: formData,
        }
      )) as IrminAPIResponse<Tag>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Create Tag error');
      if (isDevelopment) return fake(exampleTags[0]) as IrminAPIResponse<Tag>;
      throw error;
    }
  }

  /**
   * Delete a tag.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.repository - The repository slug.
   * @param props.tag - The tag identifier.
   * @returns IrminAPIResponse containing the result of the deletion.
   */
  async deleteTag({
    workspace,
    repository,
    tag,
  }: {
    workspace: string;
    repository: string;
    tag: string;
  }): Promise<IrminAPIResponse> {
    if (isOfflineMode) return fake() as IrminAPIResponse;
    try {
      const formData = new FormData();
      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/repositories/${repository}/tags/${tag}`,
        {
          method: 'DELETE',
          body: formData,
        }
      );
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Delete Tag error');
      if (isDevelopment) return fake() as IrminAPIResponse;
      throw error;
    }
  }
}

export default TagService;
