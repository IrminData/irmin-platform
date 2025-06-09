import IrminCore from '@/lib/core';

import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { Tag, TagWithAssets } from '@/types/core/Tag';

/**
 * Request payload to create a workspace tag
 */
interface TagCreateRequest {
  name: string;
  color: string;
  description: string;
}

/**
 * Request payload to update a workspace tag
 */
interface TagUpdateRequest {
  name: string;
  color: string;
  description: string;
}

/**
 * Workspace Tag API service
 *
 * Responsible for all workspace tag related API calls.
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
    this.listWorkspaceTags = this.listWorkspaceTags.bind(this);
    this.getWorkspaceTag = this.getWorkspaceTag.bind(this);
    this.createWorkspaceTag = this.createWorkspaceTag.bind(this);
    this.updateWorkspaceTag = this.updateWorkspaceTag.bind(this);
    this.deleteWorkspaceTag = this.deleteWorkspaceTag.bind(this);
    this.addTagToEntity = this.addTagToEntity.bind(this);
    this.removeTagFromEntity = this.removeTagFromEntity.bind(this);
  }

  /**
   * List all workspace tags for a workspace.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @returns IrminAPIResponse containing an array of Tag.
   */
  async listWorkspaceTags({
    workspace,
  }: {
    workspace: string;
  }): Promise<IrminAPIResponse<Tag[]>> {
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/tags`,
        { method: 'GET' }
      )) as IrminAPIResponse<Tag[]>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'List workspace tags error');
      throw error;
    }
  }

  /**
   * Get a specific workspace tag with all its associated assets.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.tagId - The tag ID.
   * @returns IrminAPIResponse containing the TagWithAssets.
   */
  async getWorkspaceTag({
    workspace,
    tagId,
  }: {
    workspace: string;
    tagId: string;
  }): Promise<IrminAPIResponse<TagWithAssets>> {
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/tags/${tagId}`,
        { method: 'GET' }
      )) as IrminAPIResponse<TagWithAssets>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Get workspace tag error');
      throw error;
    }
  }

  /**
   * Create a new workspace tag.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.request - The tag creation request.
   * @returns IrminAPIResponse containing the created Tag.
   */
  async createWorkspaceTag({
    workspace,
    request,
  }: {
    workspace: string;
    request: TagCreateRequest;
  }): Promise<IrminAPIResponse<Tag>> {
    try {
      const formData = new FormData();
      formData.append('name', request.name);
      formData.append('color', request.color);
      formData.append('description', request.description);

      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/tags`,
        {
          method: 'POST',
          body: formData,
        }
      )) as IrminAPIResponse<Tag>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Create workspace tag error');
      throw error;
    }
  }

  /**
   * Update an existing workspace tag.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.tagId - The tag ID.
   * @param props.request - The tag update request.
   * @returns IrminAPIResponse containing the updated Tag.
   */
  async updateWorkspaceTag({
    workspace,
    tagId,
    request,
  }: {
    workspace: string;
    tagId: string;
    request: TagUpdateRequest;
  }): Promise<IrminAPIResponse<Tag>> {
    try {
      const formData = new FormData();
      formData.append('name', request.name);
      formData.append('color', request.color);
      formData.append('description', request.description);

      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/tags/${tagId}`,
        {
          method: 'PATCH',
          body: formData,
        }
      )) as IrminAPIResponse<Tag>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Update workspace tag error');
      throw error;
    }
  }

  /**
   * Delete a workspace tag.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.tagId - The tag ID.
   * @returns IrminAPIResponse containing the result of the deletion.
   */
  async deleteWorkspaceTag({
    workspace,
    tagId,
  }: {
    workspace: string;
    tagId: string;
  }): Promise<IrminAPIResponse> {
    try {
      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/tags/${tagId}`,
        {
          method: 'DELETE',
        }
      );
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Delete workspace tag error');
      throw error;
    }
  }

  /**
   * Add an entity to a tag using the workspace tag route.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.tagId - The tag ID.
   * @param props.entityType - The entity type.
   * @param props.entityId - The entity ID.
   * @returns IrminAPIResponse containing the result.
   */
  async addTagToEntity({
    workspace,
    tagId,
    entityType,
    entityId,
  }: {
    workspace: string;
    tagId: string;
    entityType: string;
    entityId: string;
  }): Promise<IrminAPIResponse> {
    try {
      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/tags/${tagId}/entities/${entityType}/${entityId}`,
        {
          method: 'POST',
        }
      );
      return response;
    } catch (error) {
      console.error((error as Error).message, `Add ${entityType} to tag error`);
      throw error;
    }
  }

  /**
   * Remove an entity from a tag using the workspace tag route.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.tagId - The tag ID.
   * @param props.entityType - The entity type.
   * @param props.entityId - The entity ID.
   * @returns IrminAPIResponse containing the result.
   */
  async removeTagFromEntity({
    workspace,
    tagId,
    entityType,
    entityId,
  }: {
    workspace: string;
    tagId: string;
    entityType: string;
    entityId: string;
  }): Promise<IrminAPIResponse> {
    try {
      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/tags/${tagId}/entities/${entityType}/${entityId}`,
        {
          method: 'DELETE',
        }
      );
      return response;
    } catch (error) {
      console.error(
        (error as Error).message,
        `Remove ${entityType} from tag error`
      );
      throw error;
    }
  }
}

export default TagService;
