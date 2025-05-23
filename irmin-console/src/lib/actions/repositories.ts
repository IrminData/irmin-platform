'use server';

import { initCore } from '@/lib/initCore';

/**
 * Server action to get all repositories for a workspace.
 *
 * @param props - The properties for the function.
 * @param props.workspace - The workspace slug.
 * @param props.token - Optional user token.
 * @returns The list of repositories.
 */
export async function getRepositories({
  workspace,
  token,
}: {
  workspace: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  const repositories = await irminCore.repositoryService.fetchRepositories({
    workspace,
  });
  return repositories;
}
