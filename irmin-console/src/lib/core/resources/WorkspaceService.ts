import IrminCore from '@/lib/core';

import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { Workspace } from '@/types/core/Workspace';
import { ItemUpdateProps } from '@/types/internal/ItemUpdateProps';

/**
 * Workspace API service
 *
 * Responsible for all workspace related API calls.
 */
class WorkspaceService {
  private irminCore: IrminCore;

  /**
   * Create a new WorkspaceService.
   *
   * @param irminCore - The IrminCore instance.
   */
  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.fetchWorkspaces = this.fetchWorkspaces.bind(this);
    this.fetchWorkspace = this.fetchWorkspace.bind(this);
    this.createWorkspace = this.createWorkspace.bind(this);
    this.updateWorkspace = this.updateWorkspace.bind(this);
    this.transferWorkspace = this.transferWorkspace.bind(this);
    this.deleteWorkspace = this.deleteWorkspace.bind(this);
    this.leaveWorkspace = this.leaveWorkspace.bind(this);
  }

  /**
   * List all workspaces.
   *
   * @returns IrminAPIResponse containing an array of Workspace.
   */
  async fetchWorkspaces(): Promise<IrminAPIResponse<Workspace[]>> {
    try {
      const res = (await this.irminCore.fetchAPI(`/v1/workspaces`, {
        method: 'GET',
      })) as IrminAPIResponse<Workspace[]>;
      return res;
    } catch (error) {
      console.error((error as Error).message, 'Fetch workspaces error');
      throw error;
    }
  }

  /**
   * Fetch a single workspace by slug.
   *
   * @param props - The parameters.
   * @param props.workspaceSlug - The workspace slug.
   * @returns IrminAPIResponse containing the Workspace.
   */
  async fetchWorkspace({
    workspaceSlug,
  }: {
    workspaceSlug: string;
  }): Promise<IrminAPIResponse<Workspace>> {
    try {
      const res = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspaceSlug}`,
        {
          method: 'GET',
        }
      )) as IrminAPIResponse<Workspace>;
      return res;
    } catch (error) {
      console.error((error as Error).message, 'Fetch workspace error');
      throw error;
    }
  }

  /**
   * Create a new workspace.
   *
   * @param props - The parameters.
   * @param props.name - The workspace name.
   * @param props.description - The workspace description.
   * @returns IrminAPIResponse containing the created Workspace.
   */
  async createWorkspace({
    name,
    description,
  }: {
    name: string;
    description?: string;
  }): Promise<IrminAPIResponse<Workspace>> {
    try {
      const formData = new FormData();
      formData.append('name', name);
      if (description) formData.append('description', description);
      const res = (await this.irminCore.fetchAPI(`/v1/workspaces`, {
        method: 'POST',
        body: formData,
      })) as IrminAPIResponse<Workspace>;
      return res;
    } catch (error) {
      console.error((error as Error).message, 'Create workspace error');
      throw error;
    }
  }

  /**
   * Update a workspace.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.data - The updated properties (e.g. name, description).
   * @returns IrminAPIResponse containing the updated Workspace.
   */
  async updateWorkspace({
    workspace,
    data,
  }: {
    workspace: string;
    data: ItemUpdateProps;
  }): Promise<IrminAPIResponse<Workspace>> {
    try {
      const formData = new FormData();
      if (data.name) formData.append('name', data.name);
      if (data.description) formData.append('description', data.description);
      const res = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}`,
        {
          method: 'PUT',
          body: formData,
        }
      )) as IrminAPIResponse<Workspace>;
      return res;
    } catch (error) {
      console.error((error as Error).message, 'Update workspace error');
      throw error;
    }
  }

  /**
   * Transfer ownership of a workspace.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.newOwnerID - The new owner ID.
   * @returns IrminAPIResponse containing the updated Workspace.
   */
  async transferWorkspace({
    workspace,
    newOwnerID,
  }: {
    workspace: string;
    newOwnerID: string;
  }): Promise<IrminAPIResponse<Workspace>> {
    try {
      const params = new URLSearchParams();
      params.append('new_owner_id', newOwnerID);
      const res = await this.irminCore.fetchAPI(`/v1/workspaces/${workspace}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      return res as IrminAPIResponse<Workspace>;
    } catch (error) {
      console.error((error as Error).message, 'Transfer workspace error');
      throw error;
    }
  }

  /**
   * Delete a workspace.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @returns IrminAPIResponse containing the deletion result.
   */
  async deleteWorkspace({
    workspace,
  }: {
    workspace: string;
  }): Promise<IrminAPIResponse> {
    try {
      const res = await this.irminCore.fetchAPI(`/v1/workspaces/${workspace}`, {
        method: 'DELETE',
      });
      return res;
    } catch (error) {
      console.error((error as Error).message, 'Delete workspace error');
      throw error;
    }
  }

  /**
   * Leave a workspace.
   *
   * @param props - The parameters.
   * @param props.workspaceSlug - The workspace slug.
   * @returns IrminAPIResponse containing the result.
   */
  async leaveWorkspace({
    workspaceSlug,
  }: {
    workspaceSlug: string;
  }): Promise<IrminAPIResponse> {
    try {
      const res = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspaceSlug}/leave`,
        { method: 'GET' }
      );
      return res;
    } catch (error) {
      console.error((error as Error).message, 'Leave workspace error');
      throw error;
    }
  }
}

export default WorkspaceService;
