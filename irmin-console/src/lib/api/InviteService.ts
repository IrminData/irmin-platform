import {
  IrminAPIResponse,
  WorkspaceInviteUsersAPIResponse,
} from '@/types/IrminAPIResponse';
import { IrminRole, WorkspaceInviteUser } from '@/types/Workspace';

const api_base = process.env.NEXT_PUBLIC_API_URL;

class InviteService {
  private static instance: InviteService;
  private locale: string = 'en';

  private constructor(locale: string) {
    this.locale = locale;
  }

  public static getInstance(locale: string): InviteService {
    if (!InviteService.instance) {
      InviteService.instance = new InviteService(locale);
    } else {
      // Update the locale if the instance already exists
      InviteService.instance.setLocale(locale);
    }
    return InviteService.instance;
  }

  public setLocale(locale: string) {
    this.locale = locale;
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
  ): Promise<IrminAPIResponse | WorkspaceInviteUsersAPIResponse> {
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Accept-Language': this.locale,
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
   * @param {string} name - The user's name.
   * @param {string} email - The user's email.
   * @param {number} role - The user's role.
   * @returns {Promise<IrminAPIResponse>} A promise that resolves to the response from the API.
   */
  async inviteUserToWorkspace(
    name: string,
    email: string,
    role: number
  ): Promise<IrminAPIResponse> {
    try {
      const formData = new FormData();

      formData.append('name', name);
      formData.append('email', email);
      formData.append('role', role.toString());

      return await this.fetchWithCredentials(`${api_base}/v1/invites/create`, {
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

      return await this.fetchWithCredentials(`${api_base}/v1/invites/resend`, {
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
      formData.append('_method', 'DELETE');

      return await this.fetchWithCredentials(`${api_base}/v1/invites/cancel`, {
        method: 'POST',
        body: formData,
      });
    } catch (error) {
      console.error('Cancel invite error:', error);

      throw error;
    }
  }

  /**
   * Change the invited user's role in the workspace.
   * @param invite- The invite's ID.
   * @param role - The user's role.
   * @returns {Promise<IrminAPIResponse>} A promise that resolves to the response from the API.
   */
  async changeUserInviteRole(
    invite: number,
    role: IrminRole
  ): Promise<IrminAPIResponse> {
    try {
      const formData = new FormData();
      formData.append('invite', invite.toString());
      formData.append('role', role.id.toString());
      formData.append('_method', 'PATCH');

      return await this.fetchWithCredentials(`${api_base}/v1/invites/update`, {
        method: 'POST',
        body: formData,
      });
    } catch (error) {
      console.error('Change invite role error:', error);

      throw error;
    }
  }

  /**
   * Get a list of invites to the workspace
   * @param workspace - The workspace's slug
   * @returns {Promise<WorkspaceInviteUser[]>} A promise that resolves to an array of WorkspaceInviteUser objects.
   */
  async getInvitesByWorkspace(
    workspace: string
  ): Promise<WorkspaceInviteUser[]> {
    try {
      const response = await this.fetchWithCredentials(
        `${api_base}/v1/invites?workspace=${workspace}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response || !response.data || !Array.isArray(response.data)) {
        return [];
      }

      return response.data as WorkspaceInviteUser[];
    } catch (error) {
      console.error('Invites error:', error);
      throw error;
    }
  }

  /**
   * Get a list of invites for the user
   * @param user - The user's ID
   * @returns {Promise<WorkspaceInviteUser[]>} A promise that resolves to an array of WorkspaceInviteUser objects.
   */
  async getInvitesByUser(user: number): Promise<WorkspaceInviteUser[]> {
    try {
      const response = await this.fetchWithCredentials(
        `${api_base}/v1/invites?user=${user}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response || !response.data || !Array.isArray(response.data)) {
        return [];
      }

      return response.data as WorkspaceInviteUser[];
    } catch (error) {
      console.error('Invites error:', error);
      throw error;
    }
  }

  /**
   * Accept the invite to the workspace.
   * @param invite - The invite's ID.
   * @param password - The user's password.
   * @param password_confirmation - The user's password.
   * @param company - The user's company.
   * @returns - A promise that resolves to the response from the API. Set this if the invited user does not have an account.
   */
  async acceptUserInvite(
    invite: number,
    password: string | null,
    password_confirmation: string | null,
    company: string | null
  ): Promise<IrminAPIResponse> {
    try {
      const formData = new FormData();
      formData.append('invite', invite.toString());
      formData.append('company', company ?? '');
      formData.append('password', password ?? '');
      formData.append('password_confirmation', password_confirmation ?? '');

      return await this.fetchWithCredentials(`${api_base}/v1/invites/accept`, {
        method: 'POST',
        body: formData,
      });
    } catch (error) {
      console.error('Accept user invite error:', error);

      throw error;
    }
  }

  /**
   * Decline the invite to the workspace.
   * @param invite - The ID of the invite to decline
   * @returns - A promise that resolves to the response from the API.
   */
  async declineUserInvite(invite: number): Promise<IrminAPIResponse> {
    try {
      const formData = new FormData();
      formData.append('invite', invite.toString());
      formData.append('_method', 'DELETE');

      return await this.fetchWithCredentials(`${api_base}/v1/invites/decline`, {
        method: 'POST',
        body: formData,
      });
    } catch (error) {
      console.error('Decline user invite error:', error);

      throw error;
    }
  }
}

export default InviteService;
