'use server';

import { initCore } from '@/lib/initCore';

/**
 * Server action to get the invite inbox.
 *
 * @param props - The properties for the function.
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
 * @param props - The properties for the function.
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
 * @param props - The properties for the function.
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
