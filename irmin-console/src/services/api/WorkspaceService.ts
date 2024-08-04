import { Locale } from '@/dictionaries';
import IrminAPI from '@/services/IrminAPI';

import { IrminAPIResponse } from '@/types/api/IrminAPIResponse';
import { Workspace } from '@/types/api/Workspace';
import {
  exampleAPIResponse,
  exampleWorkspaces,
} from '@/types/examples/apiObjects';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment =
  process.env.NEXT_PUBLIC_ENVIRONMENT_TYPE === 'development';

/**
 * Workspaces API response type
 */
interface WorkspacesAPIResponse extends IrminAPIResponse {
  data: Workspace[];
}

/**
 * Workspace API response type
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
  private static instance: WorkspaceService;
  private api: IrminAPI = IrminAPI.getInstance();

  private constructor(locale: Locale, apiToken: string) {
    this.api.setProps(locale, apiToken);
  }

  /**
   * Get the instance of the WorkspaceService
   * @param locale - The locale to use for the service
   * @param apiToken - The API token to use for the service
   */
  public static getInstance(
    locale: Locale,
    apiToken: string
  ): WorkspaceService {
    if (!WorkspaceService.instance) {
      WorkspaceService.instance = new WorkspaceService(locale, apiToken);
    } else {
      // Update the existing instance
      WorkspaceService.instance.api.setProps(locale, apiToken);
    }
    return WorkspaceService.instance;
  }

  /**
   * Fetch all workspaces
   * {@link https://api.irmin.dev/docs#workspaces-GETv1-workspaces | Irmin API docs}
   * @returns response from the API or example data
   */
  async fetchWorkspaces(): Promise<WorkspacesAPIResponse> {
    if (isOfflineMode)
      return {
        ...exampleAPIResponse,
        data: exampleWorkspaces,
      };
    try {
      const response = (await this.api.fetch(`/v1/workspaces`, {
        method: 'GET',
      })) as WorkspacesAPIResponse;
      return response;
    } catch (error) {
      console.error('Fetch workspaces error:', error);
      if (isDevelopment)
        return {
          ...exampleAPIResponse,
          data: exampleWorkspaces,
        };
      throw error;
    }
  }

  /**
   * Fetch a single workspace by slug
   * {@link https://api.irmin.dev/docs#workspaces-GETv1-workspaces--slug- | Irmin API docs}
   * @param workspaceSlug - The slug of the workspace to fetch
   * @returns response from the API or example data
   */
  async fetchWorkspace(workspaceSlug: string): Promise<WorkspaceAPIResponse> {
    if (isOfflineMode)
      return {
        ...exampleAPIResponse,
        data: exampleWorkspaces[0],
      };
    try {
      const response = (await this.api.fetch(
        `/v1/workspaces/${workspaceSlug}`,
        {
          method: 'GET',
        }
      )) as WorkspaceAPIResponse;
      return response;
    } catch (error) {
      console.error('Fetch workspace error:', error);
      if (isDevelopment)
        return {
          ...exampleAPIResponse,
          data: exampleWorkspaces[0],
        };
      throw error;
    }
  }

  /**
   * Transfer the ownership of the workspace to another user
   * {@link https://api.irmin.dev/docs#workspaces-POSTv1-workspaces-transfer-ownership | Irmin API docs}
   * @param user - The ID of the user to transfer the ownership to
   * @returns response from the API or example data
   */
  async transferWorkspaceOwnership(user: number): Promise<IrminAPIResponse> {
    if (isOfflineMode) return exampleAPIResponse;
    try {
      const formData = new FormData();
      formData.append('user', user.toString());

      const response = await this.api.fetch(
        `/v1/workspaces/transfer-ownership`,
        {
          method: 'POST',
          body: formData,
        }
      );

      return response;
    } catch (error) {
      console.error('Transfer workspace ownership error:', error);
      throw error;
    }
  }

  /**
   * Create a new workspace
   * {@link https://api.irmin.dev/docs#workspaces-POSTv1-workspaces | Irmin API docs}
   * @param name - The name of the new workspace
   * @param description - The description of the new workspace
   * @returns response from the API or example data
   */
  async createWorkspace(
    name: string,
    description: string
  ): Promise<IrminAPIResponse> {
    if (isOfflineMode) return exampleAPIResponse;
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);

      const response = await this.api.fetch(`/v1/workspaces`, {
        method: 'POST',
        body: formData,
      });

      return response;
    } catch (error) {
      console.error('Create workspace error:', error);
      throw error;
    }
  }

  /**
   * Update the current workspace
   * {@link https://api.irmin.dev/docs#workspaces-PATCHv1-workspaces | Irmin API docs}
   * @param workspace - The workspace object with updated values
   * @returns response from the API or example data
   */
  async updateWorkspace(workspace: Workspace): Promise<IrminAPIResponse> {
    if (isOfflineMode) return exampleAPIResponse;
    try {
      const formData = new FormData();
      formData.append('_method', 'PATCH');
      formData.append('name', workspace.name);
      formData.append('description', workspace.description ?? '');

      const response = await this.api.fetch(`/v1/workspaces`, {
        method: 'POST',
        body: formData,
      });

      return response;
    } catch (error) {
      console.error('Update workspace error:', error);
      throw error;
    }
  }

  /**
   * Delete the current workspace
   * {@link https://api.irmin.dev/docs#workspaces-DELETEv1-workspaces | Irmin API docs}
   * @returns response from the API or example data
   */
  async deleteWorkspace(): Promise<IrminAPIResponse> {
    if (isOfflineMode) return exampleAPIResponse;
    try {
      const formData = new FormData();
      formData.append('_method', 'DELETE');
      const response = await this.api.fetch(`/v1/workspaces`, {
        method: 'POST',
        body: formData,
      });

      return response;
    } catch (error) {
      console.error('Delete workspace error:', error);
      throw error;
    }
  }

  /**
   * Switch to a Workspace
   * {@link https://api.irmin.dev/docs#workspaces-POSTv1-workspaces-switch | Irmin API docs}
   *
   * Used by the API to know which workspace to use for the current user on future requests.
   *
   * @param workspaceSlug - The slug of the workspace to switch to
   * @returns response from the API or example data
   */
  async switchWorkspace(workspaceSlug: string): Promise<WorkspaceAPIResponse> {
    if (isOfflineMode)
      return {
        ...exampleAPIResponse,
        data: exampleWorkspaces[0],
      };
    try {
      const formData = new FormData();
      formData.append('workspace', workspaceSlug);

      await this.api.fetch(`/v1/workspaces/switch`, {
        method: 'POST',
        body: formData,
      });

      const newWorkspace = await this.fetchWorkspace(workspaceSlug);

      return newWorkspace;
    } catch (error) {
      console.error('Switch workspace error:', error);
      throw error;
    }
  }
}

export default WorkspaceService;
