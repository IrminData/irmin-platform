import IrminCore from '@/lib/core';

import fake from '@/utils/prepareFakeResponse';

import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { Workspace } from '@/types/core/Workspace';
import { exampleWorkspaces } from '@/types/examples/core';
import { ItemUpdateProps } from '@/types/internal/ItemUpdateProps';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Workspaces API res type
 */
interface WorkspacesAPIResponse extends IrminAPIResponse {
  data: Workspace[];
}

/**
 * Workspace API res type
 */
interface WorkspaceAPIResponse extends IrminAPIResponse {
  data: Workspace;
}

/**
 * Workspace API service
 *
 * Responsible for all workspace related API calls.
 */
class WorkspaceService {
  private irminCore: IrminCore;

  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.fetchWorkspaces = this.fetchWorkspaces.bind(this);
    this.fetchWorkspace = this.fetchWorkspace.bind(this);
    this.transferWorkspaceOwnership =
      this.transferWorkspaceOwnership.bind(this);
    this.createWorkspace = this.createWorkspace.bind(this);
    this.updateWorkspace = this.updateWorkspace.bind(this);
    this.deleteWorkspace = this.deleteWorkspace.bind(this);
    this.switchWorkspace = this.switchWorkspace.bind(this);
  }

  /**
   * Fetch all workspaces
   */
  async fetchWorkspaces(): Promise<WorkspacesAPIResponse> {
    if (isOfflineMode) return fake(exampleWorkspaces) as WorkspacesAPIResponse;
    try {
      const res = (await this.irminCore.fetchAPI(`/v1/workspaces`, {
        method: 'GET',
      })) as WorkspacesAPIResponse;
      return res;
    } catch (error) {
      console.error((error as Error).message, 'Fetch workspaces error');
      if (isDevelopment)
        return fake(exampleWorkspaces) as WorkspacesAPIResponse;
      throw error;
    }
  }

  /**
   * Fetch a single workspace by slug
   *
   * @param workspaceSlug - The slug of the workspace to fetch
   */
  async fetchWorkspace(workspaceSlug: string): Promise<WorkspaceAPIResponse> {
    if (isOfflineMode)
      return fake(
        exampleWorkspaces.find((v) => v.slug === workspaceSlug) ??
          exampleWorkspaces[0]
      ) as WorkspaceAPIResponse;
    try {
      const res = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspaceSlug}`,
        {
          method: 'GET',
        }
      )) as WorkspaceAPIResponse;
      return res;
    } catch (error) {
      console.error((error as Error).message, 'Fetch workspace error');
      if (isDevelopment)
        return fake(
          exampleWorkspaces.find((v) => v.slug === workspaceSlug) ??
            exampleWorkspaces[0]
        ) as WorkspaceAPIResponse;
      throw error;
    }
  }

  /**
   * Transfer the ownership of a to another user
   *
   * @param workspace - The slug of the workspace to transfer the ownership of
   * @param user - The ID of the user to transfer the ownership to
   */
  async transferWorkspaceOwnership(
    workspace: string,
    user: string
  ): Promise<WorkspaceAPIResponse> {
    if (isOfflineMode)
      return fake(exampleWorkspaces[0]) as WorkspaceAPIResponse;
    try {
      const formData = new FormData();
      formData.append('user', user);
      const res = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/reassign`,
        {
          method: 'POST',
          body: formData,
        }
      )) as WorkspaceAPIResponse;
      return res;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Transfer workspace ownership error'
      );
      if (isDevelopment)
        return fake(exampleWorkspaces[0]) as WorkspaceAPIResponse;
      throw error;
    }
  }

  /**
   * Create a new workspace
   *
   * @param name - The name of the new workspace
   * @param description - (optional) The description of the new workspace
   */
  async createWorkspace(
    name: string,
    description?: string
  ): Promise<WorkspaceAPIResponse> {
    if (isOfflineMode)
      return fake(exampleWorkspaces[0]) as WorkspaceAPIResponse;
    try {
      const formData = new FormData();
      formData.append('name', name);
      if (description) formData.append('description', description);
      const res = (await this.irminCore.fetchAPI(`/v1/workspaces`, {
        method: 'POST',
        body: formData,
      })) as WorkspaceAPIResponse;
      return res;
    } catch (error) {
      console.error((error as Error).message, 'Create workspace error');
      if (isDevelopment)
        return fake(exampleWorkspaces[0]) as WorkspaceAPIResponse;
      throw error;
    }
  }

  /**
   * Update a workspace
   *
   * @param workspace - The slug of the workspace to update
   * @param data - The updated workspace properties
   */
  async updateWorkspace(
    workspace: string,
    data: ItemUpdateProps
  ): Promise<WorkspaceAPIResponse> {
    if (isOfflineMode)
      return fake(exampleWorkspaces[0]) as WorkspaceAPIResponse;
    try {
      const formData = new FormData();
      formData.append('_method', 'PATCH');
      if (data.name) formData.append('name', data.name);
      if (data.description) formData.append('description', data.description);
      const res = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}`,
        {
          method: 'POST',
          body: formData,
        }
      )) as WorkspaceAPIResponse;
      return res;
    } catch (error) {
      console.error((error as Error).message, 'Update workspace error');
      if (isDevelopment)
        return fake(exampleWorkspaces[0]) as WorkspaceAPIResponse;
      throw error;
    }
  }

  /**
   * Delete a workspace
   *
   * @param workspace - The slug of the workspace to delete
   */
  async deleteWorkspace(workspace: string) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();
      formData.append('_method', 'DELETE');
      const res = await this.irminCore.fetchAPI(`/v1/workspaces/${workspace}`, {
        method: 'POST',
        body: formData,
      });

      return res;
    } catch (error) {
      console.error((error as Error).message, 'Delete workspace error');
      if (isDevelopment) return fake();
      throw error;
    }
  }

  /**
   * Switch to a Workspace
   *
   * Used by the API to know which workspace to use for the current user on future requests.
   *
   * @param workspaceSlug - The slug of the workspace to switch to
   */
  async switchWorkspace(workspaceSlug: string): Promise<WorkspaceAPIResponse> {
    if (isOfflineMode)
      return fake(
        exampleWorkspaces.find((v) => v.slug === workspaceSlug) ??
          exampleWorkspaces[0]
      ) as WorkspaceAPIResponse;
    try {
      const newWorkspace = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspaceSlug}/switch`,
        {
          method: 'GET',
        }
      )) as WorkspaceAPIResponse;
      return newWorkspace;
    } catch (error) {
      console.error((error as Error).message, 'Switch workspace error');
      if (isDevelopment)
        return fake(
          exampleWorkspaces.find((v) => v.slug === workspaceSlug) ??
            exampleWorkspaces[0]
        ) as WorkspaceAPIResponse;
      throw error;
    }
  }
}

export default WorkspaceService;
