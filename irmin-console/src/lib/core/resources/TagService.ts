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
 * Responsible for all repository tag related API calls
 */
class TagService {
  private irminCore: IrminCore;

  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.fetchTags = this.fetchTags.bind(this);
    this.fetchTag = this.fetchTag.bind(this);
    this.updateTag = this.updateTag.bind(this);
    this.createTag = this.createTag.bind(this);
    this.deleteTag = this.deleteTag.bind(this);
  }

  /**
   * Fetch all available tags for a repository
   *
   * @param repository - slug of the repository to fetch tags for
   */
  async fetchTags(repository: string): Promise<IrminAPIResponse<Tag[]>> {
    if (isOfflineMode) return fake(exampleTags) as IrminAPIResponse<Tag[]>;
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/repositories/${repository}/tags`,
        {
          method: 'GET',
        }
      )) as IrminAPIResponse<Tag[]>;

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch Tags error');
      if (isDevelopment) return fake(exampleTags) as IrminAPIResponse<Tag[]>;
      throw error;
    }
  }

  /**
   * Fetch a single tag
   *
   * @param tag - The ID of the tag to fetch
   * @param repository - The repository slug to fetch the tag from
   */
  async fetchTag(
    tag: string,
    repository: string
  ): Promise<IrminAPIResponse<Tag>> {
    if (isOfflineMode) return fake(exampleTags[0]) as IrminAPIResponse<Tag>;
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/repositories/${repository}/tags/${tag}`,
        {
          method: 'GET',
        }
      )) as IrminAPIResponse<Tag>;

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch Tag error');
      if (isDevelopment) return fake(exampleTags[0]) as IrminAPIResponse<Tag>;
      throw error;
    }
  }

  /**
   * Update a tag
   *
   * @param tag - The ID of the tag to update
   * @param repository - The repository slug to update the tag in
   * @param name - (optional) The new name for the tag
   * @param ref - (optional) The new ref for the tag
   */
  async updateTag(
    tag: string,
    repository: string,
    name?: string,
    ref?: string
  ): Promise<IrminAPIResponse<Tag>> {
    if (isOfflineMode) return fake(exampleTags[0]) as IrminAPIResponse<Tag>;
    try {
      const formData = new FormData();
      formData.append('_method', 'PATCH');
      if (name) formData.append('name', name);
      if (ref) formData.append('ref', ref);
      const response = (await this.irminCore.fetchAPI(
        `/v1/repositories/${repository}/tags/${tag}`,
        {
          method: 'POST',
          body: formData,
        }
      )) as IrminAPIResponse<Tag>;

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Update tag error');
      if (isDevelopment) return fake(exampleTags[0]) as IrminAPIResponse<Tag>;
      throw error;
    }
  }

  /**
   * Delete a tag
   *
   * @param tag - The ID of the tag to delete
   * @param repository - The repository slug to delete the tag from
   */
  async deleteTag(tag: string, repository: string) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();
      formData.append('_method', 'DELETE');
      const response = await this.irminCore.fetchAPI(
        `/v1/repositories/${repository}/tags/${tag}`,
        {
          method: 'POST',
          body: formData,
        }
      );

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Delete tag error');
      if (isDevelopment) return fake();
      throw error;
    }
  }

  /**
   * Create a new tag
   *
   * @param name - The name of the new tag
   * @param ref - The ref to create the new tag from
   * @param repository - The repository slug to create the tag in
   */
  async createTag(
    name: string,
    ref: string,
    repository: string
  ): Promise<IrminAPIResponse<Tag>> {
    if (isOfflineMode) return fake(exampleTags[0]) as IrminAPIResponse<Tag>;
    try {
      const formData = new FormData();

      formData.append('name', name);
      formData.append('ref', ref);

      const res = (await this.irminCore.fetchAPI(
        `/v1/repositories/${repository}/tags`,
        {
          method: 'POST',
          body: formData,
        }
      )) as IrminAPIResponse<Tag>;
      return res;
    } catch (error) {
      console.error((error as Error).message, 'Failed to create tag');
      if (isDevelopment) return fake(exampleTags[0]) as IrminAPIResponse<Tag>;
      throw error;
    }
  }
}

export default TagService;
