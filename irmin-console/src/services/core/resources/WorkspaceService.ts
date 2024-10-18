import IrminCore from '@/services/core/IrminCore';

import fake from '@/utils/prepareFakeResponse';

import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { Workspace } from '@/types/core/Workspace';
import { exampleWorkspaces } from '@/types/examples/core';

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
      const res = (await this.irminCore.fetch(`/v1/workspaces`, {
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
   * @param workspaceSlug - The slug of the workspace to fetch
   */
  async fetchWorkspace(workspaceSlug: string): Promise<WorkspaceAPIResponse> {
    if (isOfflineMode)
      return fake(
        exampleWorkspaces.find((v) => v.slug === workspaceSlug) ??
          exampleWorkspaces[0]
      ) as WorkspaceAPIResponse;
    try {
      const res = (await this.irminCore.fetch(
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
   * Transfer the ownership of the workspace to another user
   * @param user - The ID of the user to transfer the ownership to
   */
  async transferWorkspaceOwnership(user: string) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();
      formData.append('user', user);

      const res = await this.irminCore.fetch(
        `/v1/workspaces/transfer-ownership`,
        {
          method: 'POST',
          body: formData,
        }
      );

      return res;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Transfer workspace ownership error'
      );
      throw error;
    }
  }

  /**
   * Create a new workspace
   * @param name - The name of the new workspace
   * @param description - The description of the new workspace
   */
  async createWorkspace(name: string, description: string) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);

      const res = await this.irminCore.fetch(`/v1/workspaces/create`, {
        method: 'POST',
        body: formData,
      });

      return res;
    } catch (error) {
      console.error((error as Error).message, 'Create workspace error');
      throw error;
    }
  }

  /**
   * Update the current workspace
   * @param workspace - The workspace object with updated values
   */
  async updateWorkspace(workspace: Workspace) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();
      formData.append('_method', 'PATCH');
      formData.append('name', workspace.name);
      formData.append('description', workspace.description ?? '');

      const res = await this.irminCore.fetch(`/v1/workspaces`, {
        method: 'POST',
        body: formData,
      });

      return res;
    } catch (error) {
      console.error((error as Error).message, 'Update workspace error');
      throw error;
    }
  }

  /**
   * Delete the current workspace
   */
  async deleteWorkspace() {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();
      formData.append('_method', 'DELETE');
      const res = await this.irminCore.fetch(`/v1/workspaces`, {
        method: 'POST',
        body: formData,
      });

      return res;
    } catch (error) {
      console.error((error as Error).message, 'Delete workspace error');
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
      const formData = new FormData();
      formData.append('workspace', workspaceSlug);

      await this.irminCore.fetch(`/v1/workspaces/switch`, {
        method: 'POST',
        body: formData,
      });

      const newWorkspace = await this.fetchWorkspace(workspaceSlug);

      return newWorkspace;
    } catch (error) {
      console.error((error as Error).message, 'Switch workspace error');
      throw error;
    }
  }
}

export default WorkspaceService;
