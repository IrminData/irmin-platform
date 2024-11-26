import IrminCore from '@/lib/core';

import fake from '@/utils/prepareFakeResponse';

import { Invite, InviteSignedURLPayload } from '@/types/core/Invite';
import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import {
  exampleInvites,
  exampleInviteSignedURLPayload,
} from '@/types/examples/core';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment = process.env.NODE_ENV === 'development';

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
    this.fetchWorkspaceInvites = this.fetchWorkspaceInvites.bind(this);
    this.fetchUserInvites = this.fetchUserInvites.bind(this);
    this.fetchInvite = this.fetchInvite.bind(this);
    this.verifyInvite = this.verifyInvite.bind(this);
    this.acceptInvite = this.acceptInvite.bind(this);
    this.declineInvite = this.declineInvite.bind(this);
  }

  /**
   * Invite a user to the workspace.
   *
   * @param first_name - The invitee's first name.
   * @param last_name - The invitee's last name.
   * @param email - The invitee's email. Can be new or existing Irmin user.
   * @param phone - The invitee's phone number.
   * @param company - The invitee's company name.
   * @param role - The invitee's role slug.
   */
  async inviteUserToWorkspace(
    first_name: string,
    last_name: string,
    email: string,
    phone: string,
    company: string,
    role: string
  ) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();

      formData.append('first_name', first_name);
      formData.append('last_name', last_name);
      formData.append('email', email);
      formData.append('phone', phone);
      formData.append('company', company);
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
   *
   * @param workspace - The workspace slug to get invites for
   * @param trashed - (optional) Include trashed invites
   * @param expired - (optional) Include expired invites
   */
  async fetchWorkspaceInvites(
    workspace: string,
    trashed?: boolean,
    expired?: boolean
  ): Promise<IrminAPIResponse<Invite[]>> {
    if (isOfflineMode)
      return fake(exampleInvites) as IrminAPIResponse<Invite[]>;
    try {
      const urlParams = new URLSearchParams();
      urlParams.append('workspace', workspace);
      if (trashed) urlParams.append('trashed', '1');
      if (expired) urlParams.append('expired', '1');
      const response = (await this.irminCore.fetchAPI(
        `/v1/invites?${urlParams.toString()}`,
        {
          method: 'GET',
        }
      )) as IrminAPIResponse<Invite[]>;

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Get invites by workspace error');
      if (isDevelopment)
        return fake(exampleInvites) as IrminAPIResponse<Invite[]>;
      throw error;
    }
  }

  /**
   * Get a list of invites for the user
   *
   * @param user - The user's ID to get invites for
   * @param trashed - (optional) Include trashed invites
   * @param expired - (optional) Include expired invites
   */
  async fetchUserInvites(
    user: string,
    trashed?: boolean,
    expired?: boolean
  ): Promise<IrminAPIResponse<Invite[]>> {
    if (isOfflineMode)
      return fake(exampleInvites) as IrminAPIResponse<Invite[]>;
    try {
      const urlParams = new URLSearchParams();
      urlParams.append('user', user);
      if (trashed) urlParams.append('trashed', '1');
      if (expired) urlParams.append('expired', '1');
      const response = (await this.irminCore.fetchAPI(
        `/v1/invites?${urlParams.toString()}`,
        {
          method: 'GET',
        }
      )) as IrminAPIResponse<Invite[]>;

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Get invites by user error');
      if (isDevelopment)
        return fake(exampleInvites) as IrminAPIResponse<Invite[]>;
      throw error;
    }
  }

  /**
   * Get invite by ID
   *
   * @param invite - ID of the invite
   */
  async fetchInvite(invite: string): Promise<IrminAPIResponse<Invite>> {
    if (isOfflineMode) return fake(exampleInvites) as IrminAPIResponse<Invite>;
    try {
      const response = (await this.irminCore.fetchAPI(`/v1/invites/${invite}`, {
        method: 'GET',
      })) as IrminAPIResponse<Invite>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Get invite by ID error');
      if (isDevelopment)
        return fake(exampleInvites) as IrminAPIResponse<Invite>;
      throw error;
    }
  }

  /**
   * Verify Invite signed URL hash.
   *
   * @param hash - The invite's signed URL hash.
   */
  async verifyInvite(
    hash: string
  ): Promise<IrminAPIResponse<InviteSignedURLPayload>> {
    if (isOfflineMode)
      return fake(
        exampleInviteSignedURLPayload
      ) as IrminAPIResponse<InviteSignedURLPayload>;
    try {
      const response = await this.irminCore.fetchAPI(
        `/v1/signed-urls/${hash}/verify`,
        {
          method: 'GET',
        }
      );
      return response as IrminAPIResponse<InviteSignedURLPayload>;
    } catch (error) {
      console.error((error as Error).message, 'Verify user invite error');
      if (isDevelopment)
        return fake(
          exampleInviteSignedURLPayload
        ) as IrminAPIResponse<InviteSignedURLPayload>;
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
      if (password) formData.append('password', password);
      if (password_confirmation)
        formData.append('password_confirmation', password_confirmation);
      const response = await this.irminCore.fetchAPI(
        `/v1/invites/${invite}/accept/${hash}`,
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
      const response = await this.irminCore.fetchAPI(
        `/v1/invites/${invite}/decline/${hash}`,
        {
          method: 'POST',
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
