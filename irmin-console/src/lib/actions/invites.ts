'use server';

import { initCore } from '@/lib/initCore';

/**
 * Server action to get the invite inbox.
 *
 * @param token - Optional token for authentication.
 * @returns The invite inbox data.
 */
export async function getInviteInbox(token?: string) {
  const irminCore = await initCore(token);
  const response = await irminCore.inviteService.listInviteInbox();
  return response.data;
}

/**
 * Server action to get the invites for a specific workspace.
 *
 * @param workspace - The workspace slug.
 * @param token - Optional token for authentication.
 * @returns The workspace invites.
 */
export async function getWorkspaceInvites(workspace: string, token?: string) {
  const irminCore = await initCore(token);
  const response = await irminCore.inviteService.listInvitesToWorkspace({
    workspace,
  });
  return response.data;
}

/**
 * Server action to fetch a single invite by ID.
 *
 * @param inviteID - The invite's identifier.
 * @param token - Optional token for authentication.
 * @returns The invite data.
 */
export async function getInvite(inviteID: string, token?: string) {
  const irminCore = await initCore(token);
  const response = await irminCore.inviteService.fetchInvite({ inviteID });
  return response.data;
}

/**
 * Server action to send an invite.
 *
 * @param workspace - The workspace slug.
 * @param email - The invitee's email.
 * @param role - The role slug.
 * @param token - Optional token for authentication.
 * @returns The sent invite.
 */
export async function sendInvite(
  workspace: string,
  email: string,
  role: string,
  token?: string
) {
  const irminCore = await initCore(token);
  const response = await irminCore.inviteService.sendInvite({
    workspace,
    email,
    role,
  });
  return response.data;
}

/**
 * Server action to resend an invite.
 *
 * @param inviteID - The invite's identifier.
 * @param token - Optional token for authentication.
 * @returns The resent invite.
 */
export async function resendInvite(inviteID: string, token?: string) {
  const irminCore = await initCore(token);
  const response = await irminCore.inviteService.resendInvite({ inviteID });
  return response.data;
}

/**
 * Server action to delete an invite.
 *
 * @param inviteID - The invite's identifier.
 * @param token - Optional token for authentication.
 * @returns The API response from deletion.
 */
export async function deleteInvite(inviteID: string, token?: string) {
  const irminCore = await initCore(token);
  const response = await irminCore.inviteService.deleteInvite({ inviteID });
  return response;
}

/**
 * Server action to update an invite's role.
 *
 * @param inviteID - The invite's identifier.
 * @param role - The new role slug.
 * @param token - Optional token for authentication.
 * @returns The updated invite.
 */
export async function updateInvite(
  inviteID: string,
  role: string,
  token?: string
) {
  const irminCore = await initCore(token);
  const response = await irminCore.inviteService.updateInvite({
    inviteID,
    role,
  });
  return response.data;
}

/**
 * Server action to accept an invite.
 *
 * @param inviteID - The invite's identifier.
 * @param token - Optional token for authentication.
 * @returns The accepted invite.
 */
export async function acceptInvite(inviteID: string, token?: string) {
  const irminCore = await initCore(token);
  const response = await irminCore.inviteService.acceptInvite({ inviteID });
  return response.data;
}

/**
 * Server action to decline an invite.
 *
 * @param inviteID - The invite's identifier.
 * @param token - Optional token for authentication.
 * @returns The declined invite.
 */
export async function declineInvite(inviteID: string, token?: string) {
  const irminCore = await initCore(token);
  const response = await irminCore.inviteService.declineInvite({ inviteID });
  return response.data;
}
