import {
  exampleAPIResponse,
  exampleWorkspace,
} from '@/lib/exampleObjects/apiObjects';
import { fetchWithCredentials } from '@/lib/fetchWithCredentials';

import { IrminAPIResponse } from '@/types/api/IrminAPIResponse';
import { Workspace } from '@/types/api/Workspace';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment =
  process.env.NEXT_PUBLIC_ENVIRONMENT_TYPE === 'development';

const api_base = process.env.NEXT_PUBLIC_API_URL;

interface WorkspacesAPIResponse extends IrminAPIResponse {
  data: Workspace[];
}

interface WorkspaceAPIResponse extends IrminAPIResponse {
  data: Workspace;
}

class WorkspaceService {
  private static instance: WorkspaceService;
  private locale: string = 'en';

  private constructor(locale: string) {
    this.locale = locale;
  }

  public static getInstance(locale: string): WorkspaceService {
    if (!WorkspaceService.instance) {
      WorkspaceService.instance = new WorkspaceService(locale);
    } else {
      // Update the locale if the instance already exists
      WorkspaceService.instance.setLocale(locale);
    }
    return WorkspaceService.instance;
  }

  public setLocale(locale: string) {
    this.locale = locale;
  }

  /**
   * Fetch all workspaces
   * @returns {Promise<WorkspacesAPIResponse>}
   * {@link https://api.irmin.dev/docs#workspaces-GETv1-workspaces Irmin API docs}
   */
  async fetchWorkspaces(): Promise<WorkspacesAPIResponse> {
    if (isOfflineMode)
      return {
        ...exampleAPIResponse,
        data: [exampleWorkspace],
      };
    try {
      const response = (await fetchWithCredentials(
        `${api_base}/v1/workspaces`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
        this.locale
      )) as WorkspacesAPIResponse;
      return response;
    } catch (error) {
      console.error('Fetch workspaces error:', error);
      if (isDevelopment)
        return {
          ...exampleAPIResponse,
          data: [exampleWorkspace],
        };
      throw error;
    }
  }

  /**
   * Fetch a single workspace by slug
   * @param {string} workspaceSlug - The slug of the workspace to fetch
   * @returns {Promise<WorkspaceAPIResponse>}
   * {@link https://api.irmin.dev/docs#workspaces-GETv1-workspaces--slug- Irmin API docs}
   */
  async fetchWorkspace(workspaceSlug: string): Promise<WorkspaceAPIResponse> {
    if (isOfflineMode)
      return {
        ...exampleAPIResponse,
        data: exampleWorkspace,
      };
    try {
      const response = (await fetchWithCredentials(
        `${api_base}/v1/workspaces/${workspaceSlug}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
        this.locale
      )) as WorkspaceAPIResponse;
      return response;
    } catch (error) {
      console.error('Fetch workspace error:', error);
      if (isDevelopment)
        return {
          ...exampleAPIResponse,
          data: exampleWorkspace,
        };
      throw error;
    }
  }

  /**
   * Transfer the ownership of the workspace to another user
   * @param {number} user - The ID of the user to transfer the ownership to
   * @returns {Promise<IrminAPIResponse>}
   * {@link https://api.irmin.dev/docs#workspaces-POSTv1-workspaces-transfer-ownership Irmin API docs}
   */
  async transferWorkspaceOwnership(user: number): Promise<IrminAPIResponse> {
    if (isOfflineMode) return exampleAPIResponse;
    try {
      const formData = new FormData();
      formData.append('user', user.toString());

      const response = await fetchWithCredentials(
        `${api_base}/v1/workspaces/transfer-ownership`,
        {
          method: 'POST',
          body: formData,
        },
        this.locale
      );

      return response;
    } catch (error) {
      console.error('Transfer workspace ownership error:', error);
      throw error;
    }
  }

  /**
   * Create a new workspace
   * @param {string} name - The name of the new workspace
   * @returns {Promise<IrminAPIResponse>}
   * {@link https://api.irmin.dev/docs#workspaces-POSTv1-workspaces Irmin API docs}
   */
  async createWorkspace(name: string): Promise<IrminAPIResponse> {
    if (isOfflineMode) return exampleAPIResponse;
    try {
      const formData = new FormData();
      formData.append('name', name);

      const response = await fetchWithCredentials(
        `${api_base}/v1/workspaces`,
        {
          method: 'POST',
          body: formData,
        },
        this.locale
      );

      return response;
    } catch (error) {
      console.error('Create workspace error:', error);
      throw error;
    }
  }

  /**
   * Update the current workspace
   * @param {Workspace} workspace - The workspace object with updated values
   * @returns {Promise<IrminAPIResponse>}
   * {@link https://api.irmin.dev/docs#workspaces-PATCHv1-workspaces Irmin API docs}
   */
  async updateWorkspace(workspace: Workspace): Promise<IrminAPIResponse> {
    if (isOfflineMode) return exampleAPIResponse;
    try {
      const formData = new FormData();
      formData.append('_method', 'PATCH');
      formData.append('name', workspace.name);

      const response = await fetchWithCredentials(
        `${api_base}/v1/workspaces`,
        {
          method: 'POST',
          body: formData,
        },
        this.locale
      );

      return response;
    } catch (error) {
      console.error('Update workspace error:', error);
      throw error;
    }
  }

  /**
   * Delete the current workspace
   * @returns {Promise<IrminAPIResponse>}
   * {@link https://api.irmin.dev/docs#workspaces-DELETEv1-workspaces Irmin API docs}
   */
  async deleteWorkspace(): Promise<IrminAPIResponse> {
    if (isOfflineMode) return exampleAPIResponse;
    try {
      const formData = new FormData();
      formData.append('_method', 'DELETE');
      const response = await fetchWithCredentials(
        `${api_base}/v1/workspaces`,
        {
          method: 'POST',
          body: formData,
        },
        this.locale
      );

      return response;
    } catch (error) {
      console.error('Delete workspace error:', error);
      throw error;
    }
  }

  /**
   * Switch to a Workspace.
   * Used by the API to know which workspace to use for the current user on future requests.
   * @param {string} workspaceSlug - The slug of the workspace to switch to
   * @returns {Promise<WorkspaceAPIResponse>}
   * {@link https://api.irmin.dev/docs#workspaces-POSTv1-workspaces-switch Irmin API docs}
   */
  async switchWorkspace(workspaceSlug: string): Promise<WorkspaceAPIResponse> {
    if (isOfflineMode)
      return {
        ...exampleAPIResponse,
        data: exampleWorkspace,
      };
    try {
      const formData = new FormData();
      formData.append('workspace', workspaceSlug);

      await fetchWithCredentials(
        `${api_base}/v1/workspaces/switch`,
        {
          method: 'POST',
          body: formData,
        },
        this.locale
      );

      const newWorkspace = await this.fetchWorkspace(workspaceSlug);

      return newWorkspace;
    } catch (error) {
      console.error('Switch workspace error:', error);
      throw error;
    }
  }
}

export default WorkspaceService;
