'use server';

import { initCore } from '@/lib/initCore';

/**
 * Server action to get all invites to the current workspace
 *
 * @returns The invites to the workspace
 */
export async function getInvites() {
  // Create the IrminCore instance
  const irminCore = await initCore();
  // Get the invites
  const invites = await irminCore.inviteService.fetchInvites();
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
export async function changeInviteRole(inviteID: string, role: string) {
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
  firstName: string,
  lastName: string,
  email: string,
  role: string
) {
  const irminCore = await initCore();
  const res = await irminCore.inviteService.inviteUserToWorkspace(
    firstName,
    lastName,
    email,
    role
  );
  return res;
}
