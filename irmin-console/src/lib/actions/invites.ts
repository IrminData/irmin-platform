'use server';

import { initCore } from '@/lib/initCore';

const signedURLToken = process.env.IRMIN_SIGNED_URL_TOKEN ?? '';

/**
 * Server action to get all invites to a workspace or for a user
 *
 * Please provide either workspace or user, not both.
 *
 * @returns The invites to the workspace
 */
export async function getInvites(
  workspace?: string,
  user?: string,
  trashed?: boolean,
  expired?: boolean,
  token?: string
) {
  const irminCore = await initCore(token);
  const invites = await irminCore.inviteService.fetchInvites(
    workspace,
    user,
    trashed,
    expired
  );
  return invites.data;
}

/**
 * Server action to cancel an invite
 */
export async function cancelInvite(inviteID: string, token?: string) {
  const irminCore = await initCore(token);
  const res = await irminCore.inviteService.cancelUserInvite(inviteID);
  return res;
}

/**
 * Server action to change the role of the invitee
 */
export async function changeInviteRole(
  inviteID: string,
  role: string,
  token?: string
) {
  const irminCore = await initCore(token);
  const res = await irminCore.inviteService.changeUserInviteRole(
    inviteID,
    role
  );
  return res;
}

/**
 * Server action to resend an invite
 */
export async function resendInvite(inviteID: string, token?: string) {
  const irminCore = await initCore(token);
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
  phone: string,
  company: string,
  role: string,
  token?: string
) {
  const irminCore = await initCore(token);
  const res = await irminCore.inviteService.inviteUserToWorkspace(
    firstName,
    lastName,
    email,
    phone,
    company,
    role
  );
  return res;
}

/**
 * Server action to verify invite hash with the signed URL token
 */
export async function verifyInviteHash(hash: string) {
  const irminCore = await initCore(signedURLToken);
  const res = await irminCore.inviteService.verifyInvite(hash);
  return res;
}

/**
 * Server action to accept an invite
 */
export async function acceptInvite(
  invite: string,
  hash: string,
  password?: string,
  password_confirmation?: string,
  token?: string
) {
  const irminCore = await initCore(token);
  const res = await irminCore.inviteService.acceptInvite(
    invite,
    hash,
    password,
    password_confirmation
  );
  return res;
}

/**
 * Server action to decline an invite
 */
export async function declineInvite(
  invite: string,
  hash: string,
  token?: string
) {
  const irminCore = await initCore(token);
  const res = await irminCore.inviteService.declineInvite(invite, hash);
  return res;
}
