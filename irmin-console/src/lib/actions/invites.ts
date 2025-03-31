'use server';

import { initCore } from '@/lib/initCore';

import { IrminRole } from '@/types/core/IrminRole';

/**
 * Server action to get the invite inbox.
 *
 * @param props.token - Optional token for authentication.
 * @returns The invite inbox data.
 */
export async function getInviteInbox({ token }: { token?: string }) {
  const irminCore = await initCore(token);
  const response = await irminCore.inviteService.listInviteInbox();
  return response;
}

/**
 * Server action to get the invites for a specific workspace.
 *
 * @param props.workspace - The workspace slug.
 * @param props.token - Optional token for authentication.
 * @returns The workspace invites.
 */
export async function getWorkspaceInvites({
  workspace,
  token,
}: {
  workspace: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  const response = await irminCore.inviteService.listInvitesToWorkspace({
    workspace,
  });
  return response;
}

/**
 * Server action to fetch a single invite by ID.
 *
 * @param props.inviteID - The invite's identifier.
 * @param props.token - Optional token for authentication.
 * @returns The invite data.
 */
export async function getInvite({
  inviteID,
  token,
}: {
  inviteID: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  const response = await irminCore.inviteService.fetchInvite({ inviteID });
  return response;
}

/**
 * Server action to send an invite.
 *
 * @param props.workspace - The workspace slug.
 * @param props.email - The invitee's email.
 * @param props.role - The role slug.
 * @param props.token - Optional token for authentication.
 * @returns The sent invite.
 */
export async function sendInvite({
  workspace,
  email,
  role,
  token,
}: {
  workspace: string;
  email: string;
  role: IrminRole;
  token?: string;
}) {
  const irminCore = await initCore(token);
  const response = await irminCore.inviteService.sendInvite({
    workspace,
    email,
    role,
  });
  return response;
}

/**
 * Server action to resend an invite.
 *
 * @param props.inviteID - The invite's identifier.
 * @param props.token - Optional token for authentication.
 * @returns The resent invite.
 */
export async function resendInvite({
  inviteID,
  token,
}: {
  inviteID: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  const response = await irminCore.inviteService.resendInvite({ inviteID });
  return response;
}

/**
 * Server action to delete an invite.
 *
 * @param props.inviteID - The invite's identifier.
 * @param props.token - Optional token for authentication.
 * @returns The API response from deletion.
 */
export async function deleteInvite({
  inviteID,
  token,
}: {
  inviteID: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  const response = await irminCore.inviteService.deleteInvite({ inviteID });
  return response;
}

/**
 * Server action to update an invite's role.
 *
 * @param props.inviteID - The invite's identifier.
 * @param props.role - The new role slug.
 * @param props.token - Optional token for authentication.
 * @returns The updated invite.
 */
export async function updateInvite({
  inviteID,
  role,
  token,
}: {
  inviteID: string;
  role: IrminRole;
  token?: string;
}) {
  const irminCore = await initCore(token);
  const response = await irminCore.inviteService.updateInvite({
    inviteID,
    role,
  });
  return response;
}

/**
 * Server action to accept an invite.
 *
 * @param props.inviteID - The invite's identifier.
 * @param props.token - Optional token for authentication.
 * @returns The accepted invite.
 */
export async function acceptInvite({
  inviteID,
  token,
}: {
  inviteID: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  const response = await irminCore.inviteService.acceptInvite({ inviteID });
  return response;
}

/**
 * Server action to decline an invite.
 *
 * @param props.inviteID - The invite's identifier.
 * @param props.token - Optional token for authentication.
 * @returns The declined invite.
 */
export async function declineInvite({
  inviteID,
  token,
}: {
  inviteID: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  const response = await irminCore.inviteService.declineInvite({ inviteID });
  return response;
}
