import {
  Workspace,
  WorkspaceAPIResponse,
  WorkspaceInviteUser,
  WorkspaceUser,
} from '@/types/Workspace';

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
  ): Promise<WorkspaceAPIResponse> {
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
          },
        }
      );
      if (!response.data || typeof response.data === 'object') return [];
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
   * Fetch the role of a user in a workspace
   * @param {string} workspaceSlug - The slug of the workspace
   * @param {number} workspaceUser - The ID of the user in the workspace
   * @returns {Promise<any[] | null>} A promise that resolves to an array of roles or null if user is not found in the workspace
   */
  async getWorkspaceUserRole(
    workspaceSlug: string,
    workspaceUser: number
  ): Promise<any[] | null> {
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
      return response.data as any[];
    } catch (error) {
      console.error('Fetch workspace user role error:', error);
      return null;
    }
  }

  /**
   * Invite a user to a workspace
   * @param {string} workspaceSlug - The slug of the workspace
   * @param {string} email - The email of the user to invite
   * @param {string} name - The name of the user to invite
   * @param {number} role - The role of the user to invite
   * @returns {Promise<any>} A promise that resolves to the response from the API
   */
  async inviteUserToWorkspace(
    workspaceSlug: string,
    email: string,
    name: string,
    role: number
  ): Promise<any> {
    try {
      const formData = new FormData();

      formData.append('email', email);
      formData.append('name', name);
      formData.append('role_id', role.toString());
      formData.append('workspace', workspaceSlug);

      const response = await this.fetchWithCredentials(
        `${api_base}/v1/invites`,
        {
          method: 'POST',
          body: formData,
        }
      );

      return response;
    } catch (error) {
      console.error('Invite user to workspace error:', error);
      throw error;
    }
  }

  /**
   * Resend an invite to a user
   * @param {number} workspaceId - The ID of the workspace
   * @param {number} inviteId - The ID of the invite to resend the invite to
   * @param {string} email - The email of the user to resend the invite to
   * @param {string} name - The name of the user to resend the invite to
   * @param {string} company - The company of the user to resend the invite to
   * @returns {Promise<any>} A promise that resolves to the response from the API
   */
  async resendUserInvite(
    inviteId: number,
    email: string,
    name: string,
    company: string
  ): Promise<any> {
    try {
      const formData = new FormData();

      formData.append('email', email);
      formData.append('name', name);
      formData.append('company', company);
      formData.append('inviteId', inviteId.toString());

      const response = await this.fetchWithCredentials(
        `${api_base}/v1/invites/resend`,
        {
          method: 'POST',
          body: formData,
        }
      );

      return response;
    } catch (error) {
      console.error('Invite user to workspace error:', error);
      throw error;
    }
  }

  /**
   * Cancel a user invite to a workspace
   * @param inviteId - The ID of the invite to cancel the invite for
   * @returns - A promise that resolves to the response from the API
   */
  async cancelUserInvite(inviteId: number): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('invite', inviteId.toString());

      const response = await this.fetchWithCredentials(
        `${api_base}/v1/invites`,
        {
          method: 'DELETE',
          body: formData,
        }
      );

      return response;
    } catch (error) {
      console.error('Cancel user invite error:', error);
      throw error;
    }
  }

  /**
   * Get all invites for a workspace
   * @param {string} workspaceSlug - The slug of the workspace
   * @returns {Promise<WorkspaceInviteUser[]>} A promise that resolves to an array of WorkspaceInviteUser objects
   */
  async getWorkspaceInvites(
    workspaceSlug: string
  ): Promise<WorkspaceInviteUser[]> {
    try {
      const response: any = await this.fetchWithCredentials(
        `${api_base}/v1/workspaces/${workspaceSlug}/invites`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      const invites = response?.data ?? [];
      return invites as WorkspaceInviteUser[];
    } catch (error) {
      console.error('Fetch workspace invites error:', error);
      throw error;
    }
  }

  /**
   * Change the role of a user in a workspace
   * @param {string}
   * @param {string} workspaceSlug - The slug of the workspace
   * @param {number} userId - The ID of the user to change the role of
   * @param {number} newRoleId - The new role ID
   * @param {number} currentRoleId - The current role ID
   * @returns {Promise<any>} A promise that resolves to the response from the API
   */
  async changeUserWorkspaceRole(
    workspaceSlug: string,
    userId: number,
    newRoleId: number,
    currentRoleId: number
  ): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('roles[]', newRoleId.toString());
      formData.append('roles[]', currentRoleId.toString());

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
   * @param {number} currentRole - The role of the user to remove
   * @returns {Promise<any>} A promise that resolves to the response from the API
   */
  async removeUserFromWorkspace(
    workspaceSlug: string,
    userId: number,
    currentRole: number
  ): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('roles[]', currentRole.toString());

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
   * @returns {Promise<any>} A promise that resolves to the response from the API
   */
  async transferWorkspaceOwnership(
    workspaceSlug: string,
    userId: number
  ): Promise<any> {
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

      const response = await this.fetchWithCredentials(
        `${api_base}/v1/workspaces`,
        {
          method: 'POST',
          body: formData,
        }
      );

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
   * @returns {Promise<WorkspaceAPIResponse>} A promise that resolves to a WorkspaceAPIResponse object
   */
  async updateWorkspace(
    workspaceSlug: string,
    workspace: Workspace
  ): Promise<WorkspaceAPIResponse> {
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

      return response;
    } catch (error) {
      console.error('Update workspace error:', error);
      throw error;
    }
  }

  /**
   * Delete a workspace
   * @param {string} workspaceSlug - The slug of the workspace to delete
   * @returns {Promise<WorkspaceAPIResponse>} A promise that resolves to a WorkspaceAPIResponse object
   */
  async deleteWorkspace(workspaceSlug: string): Promise<WorkspaceAPIResponse> {
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

      return response;
    } catch (error) {
      console.error('Delete workspace error:', error);
      throw error;
    }
  }

  /**
   * Switch to a workspace
   * @param {string} workspaceSlug - The slug of the workspace to switch to
   * @returns {Promise<Workspace | null>} A promise that resolves to a Workspace object or null
   * */
  async switchWorkspace(workspaceSlug: string): Promise<Workspace | null> {
    const offlineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
    if (offlineMode) {
      return true as any;
    }
    try {
      const formData = new FormData();
      formData.append('workspace', workspaceSlug);
      const response = await this.fetchWithCredentials(
        `${api_base}/v1/workspaces/switch`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const newWorkspace = await this.getWorkspace(workspaceSlug);

      return newWorkspace;
    } catch (error) {
      console.error('Switch workspace error:', error);
      throw error;
    }
  }
}

export default WorkspaceService;
