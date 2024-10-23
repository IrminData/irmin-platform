import IrminCore from '@/lib/core';

import fake from '@/utils/prepareFakeResponse';

import { Invite } from '@/types/core/Invite';
import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { exampleInvites } from '@/types/examples/core';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Invites API response type
 */
interface InvitesAPIResponse extends IrminAPIResponse {
  data: Invite[];
}

/**
 * Invite API response type
 */
interface InviteAPIResponse extends IrminAPIResponse {
  data: Invite;
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
    this.fetchInvites = this.fetchInvites.bind(this);
    this.fetchInvite = this.fetchInvite.bind(this);
    this.acceptInvite = this.acceptInvite.bind(this);
    this.declineInvite = this.declineInvite.bind(this);
  }

  /**
   * Invite a user to the workspace.
   *
   * @param first_name - The invitee's first name.
   * @param last_name - The invitee's last name.
   * @param email - The invitee's email. Can be new or existing Irmin user.
   * @param role - The invitee's role slug.
   */
  async inviteUserToWorkspace(
    first_name: string,
    last_name: string,
    email: string,
    role: string
  ) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();

      formData.append('first_name', first_name);
      formData.append('last_name', last_name);
      formData.append('email', email);
      formData.append('role', role);

      const response = await this.irminCore.fetchAPI(`/v1/invites`, {
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
      const response = await this.irminCore.fetchAPI(
        `/v1/invites/${invite}/resend`,
        {
          method: 'GET',
        }
      );
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
      formData.append('_method', 'DELETE');

      const response = await this.irminCore.fetchAPI(`/v1/invites/${invite}`, {
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
  async changeUserInviteRole(invite: string, role: string) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();
      formData.append('role', role);
      formData.append('_method', 'PATCH');

      const response = await this.irminCore.fetchAPI(`/v1/invites/${invite}`, {
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
   */
  async fetchInvites(): Promise<InvitesAPIResponse> {
    if (isOfflineMode) return fake(exampleInvites) as InvitesAPIResponse;
    try {
      const response = (await this.irminCore.fetchAPI(`/v1/invites`, {
        method: 'GET',
      })) as InvitesAPIResponse;

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Get invites by workspace error');
      if (isDevelopment) return fake(exampleInvites) as InvitesAPIResponse;
      throw error;
    }
  }

  /**
   * Get invite by ID
   *
   * @param invite - ID of the invite
   */
  async fetchInvite(invite: string): Promise<InviteAPIResponse> {
    if (isOfflineMode) return fake(exampleInvites) as InviteAPIResponse;
    try {
      const response = (await this.irminCore.fetchAPI(`/v1/invites/${invite}`, {
        method: 'GET',
      })) as InviteAPIResponse;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Get invite by ID error');
      if (isDevelopment) return fake(exampleInvites) as InviteAPIResponse;
      throw error;
    }
  }

  /**
   * Accept the invite to the workspace.
   *
   * @param invite - The invite's ID.
   * @param hash - The invite's signed URL hash.
   * @param password - (optional) The user's password. Only required if creating new account.
   * @param password_confirmation - (optional) The user's password. Only required if creating new account.
   */
  async acceptInvite(
    invite: string,
    hash: string,
    password?: string,
    password_confirmation?: string
  ) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();
      formData.append('hash', hash);
      if (password) formData.append('password', password);
      if (password_confirmation)
        formData.append('password_confirmation', password_confirmation);
      const response = await this.irminCore.fetchAPI(
        `/v1/invites/${invite}/accept`,
        {
          method: 'POST',
          body: formData,
        }
      );
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
   * @param hash - The invite's signed URL hash.
   */
  async declineInvite(invite: string, hash: string) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();
      formData.append('invite', invite);
      formData.append('hash', hash);

      const response = await this.irminCore.fetchAPI(
        `/v1/invites/${invite}/decline`,
        {
          method: 'POST',
          body: formData,
        }
      );
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Decline user invite error');
      if (isDevelopment) return fake();
      throw error;
    }
  }
}

export default InviteService;
