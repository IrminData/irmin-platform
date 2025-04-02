'use server';

import { initCore } from '@/lib/initCore';

/**
 * Server action to get the list of log events for a workspace.
 *
 * @param props - The properties for the function.
 * @param props.workspace - The workspace identifier.
 * @param props.token - Optional token for authentication.
 * @returns The list of log events.
 */
export async function getLogs({
  workspace,
  token,
}: {
  workspace: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  // Fetch the logs using the fetchLogEvents method which requires a workspace parameter
  const logs = await irminCore.logService.fetchLogEvents({ workspace });
  return logs;
}
