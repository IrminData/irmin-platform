import IrminCore from '@/lib/core';

import { Invite } from '@/types/core/Invite';
import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

/**
 * Invite API service
 *
 * Provides methods to interact with the invite API.
 */
class InviteService {
  private irminCore: IrminCore;

  /**
   * Create a new InviteService.
   */
  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.listInviteInbox = this.listInviteInbox.bind(this);
    this.fetchInvite = this.fetchInvite.bind(this);
    this.listInvitesToWorkspace = this.listInvitesToWorkspace.bind(this);
    this.sendInvite = this.sendInvite.bind(this);
    this.resendInvite = this.resendInvite.bind(this);
    this.deleteInvite = this.deleteInvite.bind(this);
    this.updateInvite = this.updateInvite.bind(this);
    this.acceptInvite = this.acceptInvite.bind(this);
    this.declineInvite = this.declineInvite.bind(this);
  }

  /**
   * List invite inbox.
   *
   * @returns IrminAPIResponse containing an array of Invite.
   */
  async listInviteInbox(): Promise<IrminAPIResponse<Invite[]>> {
    try {
      const endpoint = `/v1/invites`;
      const response = await this.irminCore.fetchAPI(endpoint, {
        method: 'GET',
      });
      return response as IrminAPIResponse<Invite[]>;
    } catch (error) {
      console.error('Fetch invites error', error);
      throw error;
    }
  }

  /**
   * Fetch invite by ID.
   *
   * @param props - The parameters.
   * @param props.inviteID - The invite's identifier.
   * @returns IrminAPIResponse containing the Invite.
   */
  async fetchInvite({
    inviteID,
  }: {
    inviteID: string;
  }): Promise<IrminAPIResponse<Invite>> {
    try {
      const endpoint = `/v1/invites/${inviteID}`;
      const response = await this.irminCore.fetchAPI(endpoint, {
        method: 'GET',
      });
      return response as IrminAPIResponse<Invite>;
    } catch (error) {
      console.error('Fetch invite error', error);
      throw error;
    }
  }

  /**
   * List invites to a workspace.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @returns IrminAPIResponse containing an array of Invite.
   */
  async listInvitesToWorkspace({
    workspace,
  }: {
    workspace: string;
  }): Promise<IrminAPIResponse<Invite[]>> {
    try {
      const endpoint = `/v1/workspaces/${workspace}/invites`;
      const response = await this.irminCore.fetchAPI(endpoint, {
        method: 'GET',
      });
      return response as IrminAPIResponse<Invite[]>;
    } catch (error) {
      console.error('Fetch invites to workspace error', error);
      throw error;
    }
  }

  /**
   * Send an invite.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.email - The invitee's email.
   * @param props.role - The role slug.
   * @returns IrminAPIResponse containing the sent Invite.
   */
  async sendInvite({
    workspace,
    email,
    role,
  }: {
    workspace: string;
    email: string;
    role: string;
  }): Promise<IrminAPIResponse<Invite>> {
    try {
      const endpoint = `/v1/workspaces/${workspace}/invites`;
      const body = new URLSearchParams();
      body.append('email', email);
      body.append('role', role);
      const response = await this.irminCore.fetchAPI(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      return response as IrminAPIResponse<Invite>;
    } catch (error) {
      console.error('Send invite error', error);
      throw error;
    }
  }

  /**
   * Resend an invite.
   *
   * @param props - The parameters.
   * @param props.inviteID - The invite's identifier.
   * @returns IrminAPIResponse containing the Invite.
   */
  async resendInvite({
    inviteID,
  }: {
    inviteID: string;
  }): Promise<IrminAPIResponse<Invite>> {
    try {
      const endpoint = `/v1/invites/${inviteID}/resend`;
      const response = await this.irminCore.fetchAPI(endpoint, {
        method: 'POST',
      });
      return response as IrminAPIResponse<Invite>;
    } catch (error) {
      console.error('Resend invite error', error);
      throw error;
    }
  }

  /**
   * Delete an invite.
   *
   * @param props - The parameters.
   * @param props.inviteID - The invite's identifier.
   * @returns IrminAPIResponse containing the result of deletion.
   */
  async deleteInvite({
    inviteID,
  }: {
    inviteID: string;
  }): Promise<IrminAPIResponse> {
    try {
      const endpoint = `/v1/invites/${inviteID}`;
      const response = await this.irminCore.fetchAPI(endpoint, {
        method: 'DELETE',
      });
      return response;
    } catch (error) {
      console.error('Delete invite error', error);
      throw error;
    }
  }

  /**
   * Update an invite.
   *
   * @param props - The parameters.
   * @param props.inviteID - The invite's identifier.
   * @param props.role - The new role slug.
   * @returns IrminAPIResponse containing the updated Invite.
   */
  async updateInvite({
    inviteID,
    role,
  }: {
    inviteID: string;
    role: string;
  }): Promise<IrminAPIResponse<Invite>> {
    try {
      const endpoint = `/v1/invites/${inviteID}`;
      const body = new URLSearchParams();
      body.append('role', role);
      const response = await this.irminCore.fetchAPI(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      return response as IrminAPIResponse<Invite>;
    } catch (error) {
      console.error('Update invite error', error);
      throw error;
    }
  }

  /**
   * Accept an invite.
   *
   * @param props - The parameters.
   * @param props.inviteID - The invite's identifier.
   * @returns IrminAPIResponse containing the accepted Invite.
   */
  async acceptInvite({
    inviteID,
  }: {
    inviteID: string;
  }): Promise<IrminAPIResponse<Invite>> {
    try {
      const endpoint = `/v1/invites/${inviteID}/accept`;
      const response = await this.irminCore.fetchAPI(endpoint, {
        method: 'POST',
      });
      return response as IrminAPIResponse<Invite>;
    } catch (error) {
      console.error('Accept invite error', error);
      throw error;
    }
  }

  /**
   * Decline an invite.
   *
   * @param props - The parameters.
   * @param props.inviteID - The invite's identifier.
   * @returns IrminAPIResponse containing the declined Invite.
   */
  async declineInvite({
    inviteID,
  }: {
    inviteID: string;
  }): Promise<IrminAPIResponse<Invite>> {
    try {
      const endpoint = `/v1/invites/${inviteID}/decline`;
      const response = await this.irminCore.fetchAPI(endpoint, {
        method: 'POST',
      });
      return response as IrminAPIResponse<Invite>;
    } catch (error) {
      console.error('Decline invite error', error);
      throw error;
    }
  }
}

export default InviteService;
