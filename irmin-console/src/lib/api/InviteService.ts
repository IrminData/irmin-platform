import {
  exampleAPIResponse,
  exampleInvite,
} from '@/lib/exampleObjects/apiObjects';
import { fetchWithCredentials } from '@/lib/fetchWithCredentials';

import { Invite } from '@/types/api/Invite';
import { IrminAPIResponse } from '@/types/api/IrminAPIResponse';
import { IrminRole, IrminRoleNames } from '@/types/api/IrminRole';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment =
  process.env.NEXT_PUBLIC_ENVIRONMENT_TYPE === 'development';

const api_base = process.env.NEXT_PUBLIC_API_URL;

interface InvitesAPIResponse extends IrminAPIResponse {
  data: Invite[];
}
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
   * Invite the user to the workspace.
   * @param {string} name - The user's name.
   * @param {string} email - The user's email.
   * @param {IrminRoleNames} role - The user's role slug.
   * @returns {Promise<IrminAPIResponse>}
   * {@link https://api.irmin.dev/docs#invites-POSTv1-invites-create Irmin API docs}
   */
  async inviteUserToWorkspace(
    name: string,
    email: string,
    role: IrminRoleNames
  ): Promise<IrminAPIResponse> {
    if (isOfflineMode) return exampleAPIResponse;
    try {
      const formData = new FormData();

      formData.append('name', name);
      formData.append('email', email);
      formData.append('role', role);

      const response = await fetchWithCredentials(
        `${api_base}/v1/invites/create`,
        {
          method: 'POST',
          body: formData,
        },
        this.locale
      );
      return response;
    } catch (error) {
      console.error('Invite user error:', error);
      throw error;
    }
  }

  /**
   * Resend an invite.
   * @param {number} invite - The invite's ID.
   * @returns {Promise<IrminAPIResponse>}
   * {@link https://api.irmin.dev/docs#invites-POSTv1-invites-resend Irmin API docs}
   */
  async resendUserInvite(invite: number): Promise<IrminAPIResponse> {
    if (isOfflineMode) return exampleAPIResponse;
    try {
      const formData = new FormData();

      formData.append('invite', invite.toString());

      const response = await fetchWithCredentials(
        `${api_base}/v1/invites/resend`,
        {
          method: 'POST',
          body: formData,
        },
        this.locale
      );
      return response;
    } catch (error) {
      console.error('Resend invite error:', error);
      throw error;
    }
  }

  /**
   * Cancel a user's invite to the workspace.
   * @param invite - The invite's ID.
   * @returns {Promise<IrminAPIResponse>}
   * {@link https://api.irmin.dev/docs#invites-DELETEv1-invites-cancel Irmin API docs}
   */
  async cancelUserInvite(invite: number): Promise<IrminAPIResponse> {
    if (isOfflineMode) return exampleAPIResponse;
    try {
      const formData = new FormData();
      formData.append('invite', invite.toString());
      formData.append('_method', 'DELETE');

      const response = await fetchWithCredentials(
        `${api_base}/v1/invites/cancel`,
        {
          method: 'POST',
          body: formData,
        },
        this.locale
      );
      return response;
    } catch (error) {
      console.error('Cancel invite error:', error);
      throw error;
    }
  }

  /**
   * Change the invited user's role in the workspace.
   * @param invite- The invite's ID.
   * @param role - The user's role.
   * @returns {Promise<IrminAPIResponse>}
   * {@link https://api.irmin.dev/docs#invites-PATCHv1-invites-update Irmin API docs}
   */
  async changeUserInviteRole(
    invite: number,
    role: IrminRole
  ): Promise<IrminAPIResponse> {
    if (isOfflineMode) return exampleAPIResponse;
    try {
      const formData = new FormData();
      formData.append('invite', invite.toString());
      formData.append('role', role.name);
      formData.append('_method', 'PATCH');

      const response = await fetchWithCredentials(
        `${api_base}/v1/invites/update`,
        {
          method: 'POST',
          body: formData,
        },
        this.locale
      );
      return response;
    } catch (error) {
      console.error('Change invite role error:', error);
      throw error;
    }
  }

  /**
   * Get a list of invites to the workspace
   * @param workspace - The workspace's slug
   * @returns {Promise<InvitesAPIResponse>}
   * {@link https://api.irmin.dev/docs#invites-GETv1-invites Irmin API docs}
   */
  async getInvitesByWorkspace(workspace: string): Promise<InvitesAPIResponse> {
    if (isOfflineMode) return { ...exampleAPIResponse, data: [exampleInvite] };
    try {
      const response = (await fetchWithCredentials(
        `${api_base}/v1/invites?workspace=${workspace}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
        this.locale
      )) as InvitesAPIResponse;

      return response;
    } catch (error) {
      console.error('Get invites by workspace error:', error);
      if (isDevelopment)
        return { ...exampleAPIResponse, data: [exampleInvite] };
      throw error;
    }
  }

  /**
   * Get a list of invites for the user
   * @param user - The user's ID
   * @returns {Promise<InvitesAPIResponse>}
   * {@link https://api.irmin.dev/docs#invites-GETv1-invites Irmin API docs}
   */
  async getInvitesByUser(user: number): Promise<InvitesAPIResponse> {
    if (isOfflineMode) return { ...exampleAPIResponse, data: [exampleInvite] };
    try {
      const response = (await fetchWithCredentials(
        `${api_base}/v1/invites?user=${user}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
        this.locale
      )) as InvitesAPIResponse;

      return response;
    } catch (error) {
      console.error('Get invites by user error:', error);
      if (isDevelopment)
        return { ...exampleAPIResponse, data: [exampleInvite] };
      throw error;
    }
  }

  /**
   * Accept the invite to the workspace.
   * @param invite - The invite's ID.
   * @param password - The user's password.
   * @param password_confirmation - The user's password.
   * @param company - The user's company.
   * @returns {Promise<IrminAPIResponse>}
   * {@link https://api.irmin.dev/docs#invites-POSTv1-invites-accept Irmin API docs}
   */
  async acceptInvite(
    invite: number,
    password: string | null,
    password_confirmation: string | null,
    company: string | null
  ): Promise<IrminAPIResponse> {
    if (isOfflineMode) return exampleAPIResponse;
    try {
      const formData = new FormData();
      formData.append('invite', invite.toString());
      formData.append('company', company ?? '');
      formData.append('password', password ?? '');
      formData.append('password_confirmation', password_confirmation ?? '');

      const response = await fetchWithCredentials(
        `${api_base}/v1/invites/accept`,
        {
          method: 'POST',
          body: formData,
        },
        this.locale
      );
      return response;
    } catch (error) {
      console.error('Accept user invite error:', error);
      throw error;
    }
  }

  /**
   * Decline the invite
   * @param invite - The ID of the invite to decline
   * @returns {Promise<IrminAPIResponse>}
   * {@link https://api.irmin.dev/docs#invites-DELETEv1-invites-decline Irmin API docs}
   */
  async declineInvite(invite: number): Promise<IrminAPIResponse> {
    if (isOfflineMode) return exampleAPIResponse;
    try {
      const formData = new FormData();
      formData.append('invite', invite.toString());
      formData.append('_method', 'DELETE');

      const response = await fetchWithCredentials(
        `${api_base}/v1/invites/decline`,
        {
          method: 'POST',
          body: formData,
        },
        this.locale
      );
      return response;
    } catch (error) {
      console.error('Decline user invite error:', error);
      throw error;
    }
  }
}

export default InviteService;
