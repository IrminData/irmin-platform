import IrminCore from '@/lib/core';

import fake from '@/utils/prepareFakeResponse';

import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { Tag } from '@/types/core/Tag';
import { exampleTags } from '@/types/examples/core';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Tags API response type
 */
interface TagsAPIResponse extends IrminAPIResponse {
  data: Tag[];
}

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
    this.createTag = this.createTag.bind(this);
    this.deleteTag = this.deleteTag.bind(this);
  }

  /**
   * Fetch all available tags for a repository
   *
   * @param repository - slug of the repository to fetch tags for
   */
  async fetchTags(repository: string): Promise<TagsAPIResponse> {
    if (isOfflineMode) return fake(exampleTags) as TagsAPIResponse;
    try {
      const response = (await this.irminCore.fetch(
        `/v1/tags?repository=${repository}`,
        {
          method: 'GET',
        }
      )) as TagsAPIResponse;

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch Tags error');
      if (isDevelopment) return fake(exampleTags) as TagsAPIResponse;
      throw error;
    }
  }

  /**
   * Delete a tag
   *
   * @param tag - The tag name to delete
   * @param repository - The repository slug to delete the tag from
   */
  async deleteTag(tag: string, repository: string) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();

      formData.append('_method', 'DELETE');
      formData.append('tag', tag);
      formData.append('repository', repository);

      const response = await this.irminCore.fetch(`/v1/tags`, {
        method: 'POST',
      });

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
  async createTag(name: string, ref: string, repository: string) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();

      formData.append('name', name);
      formData.append('ref', ref);
      formData.append('repository', repository);

      const res = await this.irminCore.fetch(`/v1/tags/create`, {
        method: 'POST',
        body: formData,
      });
      return res;
    } catch (error) {
      console.error((error as Error).message, 'Failed to create tag');
      if (isDevelopment) return fake();
      throw error;
    }
  }
}

export default TagService;
