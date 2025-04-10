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
  const logs = await irminCore.logService.fetchLogEvents({ workspace });
  return logs;
}

/**
 * Server action to get the list of log events for a user in a workspace.
 *
 * @param props - The properties for the function.
 * @param props.workspace - The workspace identifier.
 * @param props.user_id - The user identifier.
 * @param props.token - Optional token for authentication.
 * @returns The list of log events for the user.
 */
export async function getUserLogs({
  workspace,
  user_id,
  token,
}: {
  workspace: string;
  user_id: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  const logs = await irminCore.logService.fetchUserLogEvents({
    workspace,
    user_id,
  });
  return logs;
}

/**
 * Server action to get the list of log events for a connection in a workspace.
 *
 * @param props - The properties for the function.
 * @param props.workspace - The workspace identifier.
 * @param props.connection_id - The connection identifier.
 * @param props.token - Optional token for authentication.
 * @returns The list of log events for the connection.
 */
export async function getConnectionLogs({
  workspace,
  connection_id,
  token,
}: {
  workspace: string;
  connection_id: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  const logs = await irminCore.logService.fetchConnectionLogEvents({
    workspace,
    connection_id,
  });
  return logs;
}

/**
 * Server action to get the list of log events for a repository in a workspace.
 *
 * @param props - The properties for the function.
 * @param props.workspace - The workspace identifier.
 * @param props.repository_id - The repository identifier.
 * @param props.token - Optional token for authentication.
 * @returns The list of log events for the repository.
 */
export async function getRepositoryLogs({
  workspace,
  repository_id,
  token,
}: {
  workspace: string;
  repository_id: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  const logs = await irminCore.logService.fetchRepositoryLogEvents({
    workspace,
    repository_id,
  });
  return logs;
}

/**
 * Server action to get the list of log events for a workflow in a workspace.
 *
 * @param props - The properties for the function.
 * @param props.workspace - The workspace identifier.
 * @param props.workflow_id - The workflow identifier.
 * @param props.token - Optional token for authentication.
 * @returns The list of log events for the workflow.
 */
export async function getWorkflowLogs({
  workspace,
  workflow_id,
  token,
}: {
  workspace: string;
  workflow_id: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  const logs = await irminCore.logService.fetchWorkflowLogEvents({
    workspace,
    workflow_id,
  });
  return logs;
}

/**
 * Server action to get the list of log events for a workflow run in a workspace.
 *
 * @param props - The properties for the function.
 * @param props.workspace - The workspace identifier.
 * @param props.workflow_run_id - The workflow run identifier.
 * @param props.token - Optional token for authentication.
 * @returns The list of log events for the workflow run.
 */
export async function getWorkflowRunLogs({
  workspace,
  workflow_run_id,
  token,
}: {
  workspace: string;
  workflow_run_id: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  const logs = await irminCore.logService.fetchWorkflowRunLogEvents({
    workspace,
    workflow_run_id,
  });
  return logs;
}
