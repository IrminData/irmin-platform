import IrminCore from '@/services/core/IrminCore';

import fake from '@/utils/prepareFakeResponse';

import { Invite } from '@/types/core/Invite';
import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { IrminRoleNames } from '@/types/core/IrminRole';
import { exampleInvites } from '@/types/examples/core';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment =
  process.env.NEXT_PUBLIC_ENVIRONMENT_TYPE === 'development';

/**
 * Invites API response type
 */
interface InvitesAPIResponse extends IrminAPIResponse {
  data: Invite[];
}

/**
 * Invite API service
 *
 * Responsible for all invite related API calls.
 */
class InviteService {
  private irminCore: IrminCore;

  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.inviteUserToWorkspace = this.inviteUserToWorkspace.bind(this);
    this.resendUserInvite = this.resendUserInvite.bind(this);
    this.cancelUserInvite = this.cancelUserInvite.bind(this);
    this.changeUserInviteRole = this.changeUserInviteRole.bind(this);
    this.fetchInvitesByWorkspace = this.fetchInvitesByWorkspace.bind(this);
    this.fetchInvitesByUser = this.fetchInvitesByUser.bind(this);
    this.acceptInvite = this.acceptInvite.bind(this);
    this.declineInvite = this.declineInvite.bind(this);
  }

  /**
   * Invite a user to the workspace.
   * {@link https://api.irmin.dev/docs#invites-POSTv1-invites-create | Irmin API docs}
   * @param name - The user's name.
   * @param email - The user's email. Can be new or existing Irmin user.
   * @param role - The user's role slug.
   */
  async inviteUserToWorkspace(
    name: string,
    email: string,
    role: IrminRoleNames
  ) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();

      formData.append('name', name);
      formData.append('email', email);
      formData.append('role', role);

      const response = await this.irminCore.fetch(`/v1/invites/create`, {
        method: 'POST',
        body: formData,
      });
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Invite user error');
      throw error;
    }
  }

  /**
   * Resend an invite.
   * {@link https://api.irmin.dev/docs#invites-POSTv1-invites-resend | Irmin API docs}
   * @param invite - The invite's ID.
   */
  async resendUserInvite(invite: number) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();

      formData.append('invite', invite.toString());

      const response = await this.irminCore.fetch(`/v1/invites/resend`, {
        method: 'POST',
        body: formData,
      });
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Resend invite error');
      throw error;
    }
  }

  /**
   * Cancel a user's invite to the workspace.
   * {@link https://api.irmin.dev/docs#invites-DELETEv1-invites-cancel | Irmin API docs}
   * @param invite - The invite's ID.
   */
  async cancelUserInvite(invite: number) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();
      formData.append('invite', invite.toString());
      formData.append('_method', 'DELETE');

      const response = await this.irminCore.fetch(`/v1/invites/cancel`, {
        method: 'POST',
        body: formData,
      });
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Cancel invite error');
      throw error;
    }
  }

  /**
   * Change the invited user's role in the workspace.
   * {@link https://api.irmin.dev/docs#invites-PATCHv1-invites-update | Irmin API docs}
   * @param invite - The invite's ID.
   * @param role - The role slug.
   */
  async changeUserInviteRole(invite: number, role: IrminRoleNames) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();
      formData.append('invite', invite.toString());
      formData.append('role', role);
      formData.append('_method', 'PATCH');

      const response = await this.irminCore.fetch(`/v1/invites/update`, {
        method: 'POST',
        body: formData,
      });
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Change invite role error');
      throw error;
    }
  }

  /**
   * Get a list of invites to the workspace
   * {@link https://api.irmin.dev/docs#invites-GETv1-invites | Irmin API docs}
   * @param workspace - The workspace's slug
   */
  async fetchInvitesByWorkspace(
    workspace: string
  ): Promise<InvitesAPIResponse> {
    if (isOfflineMode) return fake(exampleInvites) as InvitesAPIResponse;
    try {
      const response = (await this.irminCore.fetch(
        `/v1/invites?workspace=${workspace}`,
        {
          method: 'GET',
        }
      )) as InvitesAPIResponse;

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Get invites by workspace error');
      if (isDevelopment) return fake(exampleInvites) as InvitesAPIResponse;
      throw error;
    }
  }

  /**
   * Get a list of invites for the user
   * {@link https://api.irmin.dev/docs#invites-GETv1-invites | Irmin API docs}
   * @param user - The user's ID
   */
  async fetchInvitesByUser(user: number): Promise<InvitesAPIResponse> {
    if (isOfflineMode) return fake(exampleInvites) as InvitesAPIResponse;
    try {
      const response = (await this.irminCore.fetch(`/v1/invites?user=${user}`, {
        method: 'GET',
      })) as InvitesAPIResponse;

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Get invites by user error');
      if (isDevelopment) return fake(exampleInvites) as InvitesAPIResponse;
      throw error;
    }
  }

  /**
   * Accept the invite to the workspace.
   * {@link https://api.irmin.dev/docs#invites-POSTv1-invites-accept | Irmin API docs}
   * @param invite - The invite's ID.
   * @param password - The user's password.
   * @param password_confirmation - The user's password.
   * @param company - The user's company.
   */
  async acceptInvite(
    invite: number,
    password: string | null,
    password_confirmation: string | null,
    company: string | null
  ) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();
      formData.append('invite', invite.toString());
      formData.append('company', company ?? '');
      formData.append('password', password ?? '');
      formData.append('password_confirmation', password_confirmation ?? '');

      const response = await this.irminCore.fetch(`/v1/invites/accept`, {
        method: 'POST',
        body: formData,
      });
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Accept user invite error');
      throw error;
    }
  }

  /**
   * Decline the invite
   * {@link https://api.irmin.dev/docs#invites-DELETEv1-invites-decline | Irmin API docs}
   * @param invite - The ID of the invite to decline
   */
  async declineInvite(invite: number) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();
      formData.append('invite', invite.toString());
      formData.append('_method', 'DELETE');

      const response = await this.irminCore.fetch(`/v1/invites/decline`, {
        method: 'POST',
        body: formData,
      });
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Decline user invite error');
      throw error;
    }
  }
}

export default InviteService;
