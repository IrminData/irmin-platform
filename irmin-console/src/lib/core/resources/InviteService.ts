import IrminCore from '@/lib/core';

import fake from '@/utils/prepareFakeResponse';

import { Invite } from '@/types/core/Invite';
import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { exampleInvites, exampleRoles } from '@/types/examples/core';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment = process.env.NODE_ENV === 'development';

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
    if (isOfflineMode) {
      return fake(exampleInvites) as IrminAPIResponse<Invite[]>;
    }
    try {
      const endpoint = `/v1/invites`;
      const response = await this.irminCore.fetchAPI(endpoint, {
        method: 'GET',
      });
      return response as IrminAPIResponse<Invite[]>;
    } catch (error: any) {
      console.error(error.message, 'Fetch invites error');
      if (isDevelopment) {
        return fake(exampleInvites) as IrminAPIResponse<Invite[]>;
      }
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
    if (isOfflineMode) {
      return fake(exampleInvites[0]) as IrminAPIResponse<Invite>;
    }
    try {
      const endpoint = `/v1/invites/${inviteID}`;
      const response = await this.irminCore.fetchAPI(endpoint, {
        method: 'GET',
      });
      return response as IrminAPIResponse<Invite>;
    } catch (error: any) {
      console.error(error.message, 'Fetch invite error');
      if (isDevelopment) {
        return fake(exampleInvites[0]) as IrminAPIResponse<Invite>;
      }
      throw error;
    }
  }

  /**
   * List invites to a workspace.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace identifier.
   * @returns IrminAPIResponse containing an array of Invite.
   */
  async listInvitesToWorkspace({
    workspace,
  }: {
    workspace: string;
  }): Promise<IrminAPIResponse<Invite[]>> {
    if (isOfflineMode) {
      return fake(exampleInvites) as IrminAPIResponse<Invite[]>;
    }
    try {
      const endpoint = `/v1/workspaces/${workspace}/invites`;
      const response = await this.irminCore.fetchAPI(endpoint, {
        method: 'GET',
      });
      return response as IrminAPIResponse<Invite[]>;
    } catch (error: any) {
      console.error(error.message, 'Fetch invites to workspace error');
      if (isDevelopment) {
        return fake(exampleInvites) as IrminAPIResponse<Invite[]>;
      }
      throw error;
    }
  }

  /**
   * Send an invite.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace identifier.
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
    if (isOfflineMode) {
      return fake({
        email,
        role: exampleRoles.find((r) => r.name === role) ?? exampleRoles[0],
        invited_at: new Date().toISOString(),
        expired_at: null,
        deleted_at: null,
      }) as IrminAPIResponse<Invite>;
    }
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
    } catch (error: any) {
      console.error(error.message, 'Send invite error');
      if (isDevelopment) {
        return fake({
          email,
          role: exampleRoles.find((r) => r.name === role) ?? exampleRoles[0],
          invited_at: new Date().toISOString(),
          expired_at: null,
          deleted_at: null,
        }) as IrminAPIResponse<Invite>;
      }
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
    if (isOfflineMode) {
      return fake(exampleInvites[0]) as IrminAPIResponse<Invite>;
    }
    try {
      const endpoint = `/v1/invites/${inviteID}/resend`;
      const response = await this.irminCore.fetchAPI(endpoint, {
        method: 'POST',
      });
      return response as IrminAPIResponse<Invite>;
    } catch (error: any) {
      console.error(error.message, 'Resend invite error');
      if (isDevelopment) {
        return fake(exampleInvites[0]) as IrminAPIResponse<Invite>;
      }
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
    if (isOfflineMode) {
      return fake(null) as IrminAPIResponse;
    }
    try {
      const endpoint = `/v1/invites/${inviteID}`;
      const response = await this.irminCore.fetchAPI(endpoint, {
        method: 'DELETE',
      });
      return response;
    } catch (error: any) {
      console.error(error.message, 'Delete invite error');
      if (isDevelopment) {
        return fake(null) as IrminAPIResponse;
      }
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
    if (isOfflineMode) {
      return fake(exampleInvites[0]) as IrminAPIResponse<Invite>;
    }
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
    } catch (error: any) {
      console.error(error.message, 'Update invite error');
      if (isDevelopment) {
        return fake(exampleInvites[0]) as IrminAPIResponse<Invite>;
      }
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
    if (isOfflineMode) {
      return fake(exampleInvites[0]) as IrminAPIResponse<Invite>;
    }
    try {
      const endpoint = `/v1/invites/${inviteID}/accept`;
      const response = await this.irminCore.fetchAPI(endpoint, {
        method: 'POST',
      });
      return response as IrminAPIResponse<Invite>;
    } catch (error: any) {
      console.error(error.message, 'Accept invite error');
      if (isDevelopment) {
        return fake(exampleInvites[0]) as IrminAPIResponse<Invite>;
      }
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
    if (isOfflineMode) {
      return fake(exampleInvites[0]) as IrminAPIResponse<Invite>;
    }
    try {
      const endpoint = `/v1/invites/${inviteID}/decline`;
      const response = await this.irminCore.fetchAPI(endpoint, {
        method: 'POST',
      });
      return response as IrminAPIResponse<Invite>;
    } catch (error: any) {
      console.error(error.message, 'Decline invite error');
      if (isDevelopment) {
        return fake(exampleInvites[0]) as IrminAPIResponse<Invite>;
      }
      throw error;
    }
  }
}

export default InviteService;
