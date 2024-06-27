import { IrminAPIResponse } from '@/types/IrminAPIResponse';
import { WorkspaceInviteUser } from '@/types/Workspace';

const api_base = process.env.NEXT_PUBLIC_API_URL;

class InviteService {
  private static instance: InviteService;

  private constructor() {}

  // Get the singleton instance of the WorkspaceService class
  public static getInstance(): InviteService {
    if (!InviteService.instance) {
      InviteService.instance = new InviteService();
    }
    return InviteService.instance;
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
  ): Promise<IrminAPIResponse> {
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
   * Invite the user to the workspace.
   * @param {string} workspace - The workspace's slug.
   * @param {string} name - The user's name.
   * @param {string} email - The user's email.
   * @param {number} role - The user's role.
   * @returns {Promise<IrminAPIResponse>} A promise that resolves to the response from the API.
   */
  async inviteUserToWorkspace(
    workspace: string,
    name: string,
    email: string,
    role: number
  ): Promise<IrminAPIResponse> {
    try {
      const formData = new FormData();

      formData.append('name', name);
      formData.append('email', email);
      formData.append('role', role.toString());
      formData.append('workspace', workspace);

      return await this.fetchWithCredentials(`${api_base}/v1/invite/create`, {
        method: 'POST',
        body: formData,
      });
    } catch (error) {
      console.error('Invite user error:', error);

      throw error;
    }
  }

  /**
   * Resend an invite.
   * @param {number} invite - The invite's ID.
   * @returns {Promise<IrminAPIResponse>} A promise that resolves to the response from the API.
   */
  async resendUserInvite(invite: number): Promise<IrminAPIResponse> {
    try {
      const formData = new FormData();

      formData.append('invite', invite.toString());

      return await this.fetchWithCredentials(`${api_base}/v1/invite/resend`, {
        method: 'POST',
        body: formData,
      });
    } catch (error) {
      console.error('Resend invite error:', error);

      throw error;
    }
  }

  /**
   * Cancel a user's invite to the workspace.
   * @param invite - The invite's ID.
   * @returns {Promise<IrminAPIResponse>} A promise that resolves to the response from the API.
   */
  async cancelUserInvite(invite: number): Promise<IrminAPIResponse> {
    try {
      const formData = new FormData();
      formData.append('invite', invite.toString());

      return await this.fetchWithCredentials(`${api_base}/v1/invite/cancel`, {
        method: 'DELETE',
        body: formData,
      });
    } catch (error) {
      console.error('Cancel invite error:', error);

      throw error;
    }
  }

  /**
   * Get a list of invites sent by a user or workspace.
   * @param {string} workspace - The workspace's slug.
   * @returns {Promise<WorkspaceInviteUser[]>} A promise that resolves to an array of WorkspaceInviteUser objects.
   */
  async getInvites(workspace: string): Promise<WorkspaceInviteUser[]> {
    try {
      const response: any = await this.fetchWithCredentials(
        `${api_base}/v1/invites?workspace=${workspace}`,
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
      console.error('Invites error:', error);
      throw error;
    }
  }
}

export default InviteService;
