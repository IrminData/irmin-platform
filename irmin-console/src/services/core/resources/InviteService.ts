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
   *
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
      if (isDevelopment) return fake();
      throw error;
    }
  }

  /**
   * Resend an invite.
   *
   * @param invite - The invite's ID.
   */
  async resendUserInvite(invite: string) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();

      formData.append('invite', invite);

      const response = await this.irminCore.fetch(`/v1/invites/resend`, {
        method: 'POST',
        body: formData,
      });
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Resend invite error');
      if (isDevelopment) return fake();
      throw error;
    }
  }

  /**
   * Cancel a user's invite to the workspace.
   *
   * @param invite - The invite's ID.
   */
  async cancelUserInvite(invite: string) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();
      formData.append('invite', invite);
      formData.append('_method', 'DELETE');

      const response = await this.irminCore.fetch(`/v1/invites/cancel`, {
        method: 'POST',
        body: formData,
      });
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Cancel invite error');
      if (isDevelopment) return fake();
      throw error;
    }
  }

  /**
   * Change the invited user's role in the workspace.
   *
   * @param invite - The invite's ID.
   * @param role - The role slug.
   */
  async changeUserInviteRole(invite: string, role: IrminRoleNames) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();
      formData.append('invite', invite);
      formData.append('role', role);
      formData.append('_method', 'PATCH');

      const response = await this.irminCore.fetch(`/v1/invites/update`, {
        method: 'POST',
        body: formData,
      });
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Change invite role error');
      if (isDevelopment) return fake();
      throw error;
    }
  }

  /**
   * Get a list of invites to the workspace
   *
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
   *
   * @param user - The user's ID
   */
  async fetchInvitesByUser(user: string): Promise<InvitesAPIResponse> {
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
   *
   * @param invite - The invite's ID.
   * @param password - The user's password.
   * @param password_confirmation - The user's password.
   * @param company - The user's company.
   */
  async acceptInvite(
    invite: string,
    password: string | null,
    password_confirmation: string | null,
    company: string | null
  ) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();
      formData.append('invite', invite);
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
      if (isDevelopment) return fake();
      throw error;
    }
  }

  /**
   * Decline the invite
   *
   * @param invite - The ID of the invite to decline
   */
  async declineInvite(invite: string) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();
      formData.append('invite', invite);
      formData.append('_method', 'DELETE');

      const response = await this.irminCore.fetch(`/v1/invites/decline`, {
        method: 'POST',
        body: formData,
      });
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Decline user invite error');
      if (isDevelopment) return fake();
      throw error;
    }
  }
}

export default InviteService;
