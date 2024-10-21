'use server';

import { initCore } from '@/lib/initCore';

import { IrminRoleNames } from '@/types/core/IrminRole';

/**
 * Server action to get all invites to a workspace
 *
 * @param workspaceSlug - The slug of the workspace
 * @returns The invites to the workspace
 */
export async function getInvites(workspaceSlug: string) {
  // Create the IrminCore instance
  const irminCore = await initCore();
  // Get the invites
  const invites =
    await irminCore.inviteService.fetchInvitesByWorkspace(workspaceSlug);
  return invites.data;
}

/**
 * Server action to cancel an invite
 */
export async function cancelInvite(inviteID: string) {
  const irminCore = await initCore();
  const res = await irminCore.inviteService.cancelUserInvite(inviteID);
  return res;
}

/**
 * Server action to change the role of the invitee
 */
export async function changeInviteRole(inviteID: string, role: IrminRoleNames) {
  const irminCore = await initCore();
  const res = await irminCore.inviteService.changeUserInviteRole(
    inviteID,
    role
  );
  return res;
}

/**
 * Server action to resend an invite
 */
export async function resendInvite(inviteID: string) {
  const irminCore = await initCore();
  const res = await irminCore.inviteService.resendUserInvite(inviteID);
  return res;
}

/**
 * Server action to send an invite
 */
export async function sendInvite(
  name: string,
  email: string,
  role: IrminRoleNames
) {
  const irminCore = await initCore();
  const res = await irminCore.inviteService.inviteUserToWorkspace(
    name,
    email,
    role
  );
  return res;
}
