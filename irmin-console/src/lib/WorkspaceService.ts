import {
  IrminAPIResponse,
  WorkspaceAPIResponse,
  WorkspacesAPIResponse,
} from '@/types/IrminAPIResponse';
import { Workspace, IrminRole, WorkspaceUser } from '@/types/Workspace';

const api_base = process.env.NEXT_PUBLIC_API_URL;

class WorkspaceService {
  private static instance: WorkspaceService;

  private constructor() {}

  // Get the singleton instance of the WorkspaceService class
  public static getInstance(): WorkspaceService {
    if (!WorkspaceService.instance) {
      WorkspaceService.instance = new WorkspaceService();
    }
    return WorkspaceService.instance;
  }

  /**
   * Fetch data from the API with credentials
   * @param {string} url - The URL to fetch data from
   * @param {RequestInit} options - The fetch options
   * @returns {Promise<WorkspaceAPIResponse>} A promise that resolves to a WorkspaceAPIResponse object
   */
  private async fetchWithCredentials(
    url: string,
    options: RequestInit
  ): Promise<WorkspaceAPIResponse | WorkspacesAPIResponse> {
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Accept-Language': navigator.language ?? 'en',
        Referer: window.location.origin,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Request failed');
    }

    return response.json();
  }

  /**
   * Fetch all workspaces
   * @returns {Promise<Workspace[]>} A promise that resolves to an array of Workspace objects
   */
  async getWorkspaces(): Promise<Workspace[]> {
    try {
      const response = await this.fetchWithCredentials(
        `${api_base}/v1/workspaces`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        }
      );
      if (!response.data || !Array.isArray(response.data)) return [];
      return response.data;
    } catch (error) {
      console.error('Fetch workspaces error:', error);
      throw error;
    }
  }

  /**
   * Fetch a workspace by its slug
   * @param {string} workspaceSlug - The slug of the workspace to fetch
   * @returns {Promise<Workspace | null>} A promise that resolves to a Workspace object or null
   * if the workspace is not found
   */
  async getWorkspace(workspaceSlug: string): Promise<Workspace | null> {
    try {
      const response = await this.fetchWithCredentials(
        `${api_base}/v1/workspaces/${workspaceSlug}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      if (response.data && !Array.isArray(response.data)) return response.data;
      return null;
    } catch (error) {
      console.error('Fetch workspace error:', error);
      throw error;
    }
  }

  /**
   * Fetch all users in a workspace
   * @param {string} workspaceSlug - The slug of the workspace to fetch users from
   * @returns {Promise<WorkspaceUser[]>} A promise that resolves to an array of WorkspaceUser objects
   */
  async getWorkspaceUsers(workspaceSlug: string): Promise<WorkspaceUser[]> {
    try {
      const response = await this.fetchWithCredentials(
        `${api_base}/v1/workspaces/${workspaceSlug}/users`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data as any as WorkspaceUser[];
    } catch (error) {
      console.error('Fetch workspace users error:', error);
      throw error;
    }
  }

  /**
   * Fetch all available Irmin roles
   * @returns {Promise<IrminRole[]>} A promise that resolves to an array of roles
   */
  async getIrminRoles(): Promise<IrminRole[]> {
    try {
      const response = await this.fetchWithCredentials(`${api_base}/v1/roles`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.data as any as IrminRole[];
    } catch (error) {
      console.error('Fetch irmin roles error:', error);
      return [];
    }
  }

  /**
   * Fetch the role of a user in a workspace
   * @param {string} workspaceSlug - The slug of the workspace
   * @param {number} workspaceUser - The ID of the user in the workspace
   * @returns {Promise<IrminRole[] | null>} A promise that resolves to an array of roles or null if user is not found in the workspace
   */
  async getWorkspaceUserRole(
    workspaceSlug: string,
    workspaceUser: number
  ): Promise<IrminRole[] | null> {
    try {
      const response = await this.fetchWithCredentials(
        `${api_base}/v1/workspaces/${workspaceSlug}/users/${workspaceUser}/roles`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data as any as IrminRole[];
    } catch (error) {
      console.error('Fetch workspace user role error:', error);
      return null;
    }
  }

  /**
   * Change the role of a user in a workspace
   * @param {string}
   * @param {string} workspaceSlug - The slug of the workspace
   * @param {number} userId - The ID of the user to change the role of
   * @param {IrminRole} newRoleId - The new role
   * @param {IrminRole | null} currentRoleId - The current role or null if user has no role
   * @returns {Promise<any>} A promise that resolves to the response from the API
   */
  async changeUserWorkspaceRole(
    workspaceSlug: string,
    userId: number,
    newRole: IrminRole,
    currentRole: IrminRole | null
  ): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('roles[]', newRole.id.toString());
      if (currentRole) {
        formData.append('roles[]', currentRole.id.toString());
      }

      const response = await this.fetchWithCredentials(
        `${api_base}/v1/workspaces/${workspaceSlug}/users/${userId}/roles`,
        {
          method: 'POST',
          body: formData,
        }
      );

      return response;
    } catch (error) {
      console.error('Change user workspace role error:', error);
      throw error;
    }
  }

  /**
   * Remove a user from a workspace
   * @param {string}
   * @param {string} workspaceSlug - The slug of the workspace
   * @param {number} userId - The ID of the user to remove
   * @param {IrminRole} currentRole - The role of the user to remove
   * @returns {Promise<any>} A promise that resolves to the response from the API
   */
  async removeUserFromWorkspace(
    workspaceSlug: string,
    userId: number,
    currentRole: IrminRole
  ): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('roles[]', currentRole.id.toString());

      const response = await this.fetchWithCredentials(
        `${api_base}/v1/workspaces/${workspaceSlug}/users/${userId}/roles`,
        {
          method: 'POST',
          body: formData,
        }
      );

      return response;
    } catch (error) {
      console.error('Remove user from workspace error:', error);
      throw error;
    }
  }

  /**
   * Transfer the ownership of a workspace
   * @param {string}
   * @param {string} workspaceSlug - The slug of the workspace
   * @param {number} userId - The ID of the user to transfer the ownership to
   * @returns {Promise<IrminAPIResponse>} A promise that resolves to the response from the API
   */
  async transferWorkspaceOwnership(
    workspaceSlug: string,
    userId: number
  ): Promise<IrminAPIResponse> {
    try {
      const formData = new FormData();
      formData.append('user_id', userId.toString());

      const response = await this.fetchWithCredentials(
        `${api_base}/v1/workspaces/${workspaceSlug}/transfer-ownership`,
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
   * @param {string} name - The name of the workspace
   * @returns {Promise<WorkspaceAPIResponse>} A promise that resolves to a WorkspaceAPIResponse object
   */
  async createWorkspace(name: string): Promise<WorkspaceAPIResponse> {
    try {
      const formData = new FormData();
      formData.append('name', name);

      const response = (await this.fetchWithCredentials(
        `${api_base}/v1/workspaces`,
        {
          method: 'POST',
          body: formData,
        }
      )) as WorkspaceAPIResponse;

      return response;
    } catch (error) {
      console.error('Create workspace error:', error);
      throw error;
    }
  }

  /**
   * Update a workspace
   * @param {string} workspaceSlug - The slug of the workspace to update
   * @param {Workspace} workspace - The workspace object with updated values
   * @returns {Promise<IrminAPIResponse>} A promise that resolves to a IrminAPIResponse object
   */
  async updateWorkspace(
    workspaceSlug: string,
    workspace: Workspace
  ): Promise<IrminAPIResponse> {
    try {
      const formData = new FormData();
      formData.append('name', workspace.name);
      formData.append('_method', 'PATCH');

      const response = await this.fetchWithCredentials(
        `${api_base}/v1/workspaces/${workspaceSlug}`,
        {
          method: 'POST',
          body: formData,
        }
      );

      return response as IrminAPIResponse;
    } catch (error) {
      console.error('Update workspace error:', error);
      throw error;
    }
  }

  /**
   * Delete a workspace
   * @param {string} workspaceSlug - The slug of the workspace to delete
   * @returns {Promise<IrminAPIResponse>} A promise that resolves to a IrminAPIResponse object
   */
  async deleteWorkspace(workspaceSlug: string): Promise<IrminAPIResponse> {
    try {
      const formData = new FormData();
      formData.append('workspace', workspaceSlug);
      formData.append('_method', 'DELETE');
      const response = await this.fetchWithCredentials(
        `${api_base}/v1/workspaces`,
        {
          method: 'POST',
          body: formData,
        }
      );

      return response as IrminAPIResponse;
    } catch (error) {
      console.error('Delete workspace error:', error);
      throw error;
    }
  }

  /**
   * Switch to a workspace
   * @param {string} workspaceSlug - The slug of the workspace to switch to
   * @returns {Promise<Workspace | null>} A promise that resolves to a Workspace object or null
   * */
  async switchWorkspace(workspaceSlug: string): Promise<Workspace | null> {
    const offlineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
    if (offlineMode) {
      return true as any;
    }
    try {
      const formData = new FormData();
      formData.append('workspace', workspaceSlug);

      await this.fetchWithCredentials(`${api_base}/v1/workspaces/switch`, {
        method: 'POST',
        body: formData,
      });

      const newWorkspace = await this.getWorkspace(workspaceSlug);

      return newWorkspace;
    } catch (error) {
      console.error('Switch workspace error:', error);
      throw error;
    }
  }
}

export default WorkspaceService;
