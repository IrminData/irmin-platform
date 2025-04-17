'use server';

import { initCore } from '@/lib/initCore';

/**
 * Server action to get a list of branches in a repository.
 *
 * @param props - The properties for the function
 * @param props.workspace - The workspace to fetch the branches from
 * @param props.repository - The repository slug to fetch the branches from
 * @param props.token - Optional token for authentication
 * @returns The list of branches
 */
export async function getBranches({
  workspace,
  repository,
  token,
}: {
  workspace: string;
  repository: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  // Get the branches
  const branchesResponse = await irminCore.branchService.fetchBranches({
    workspace,
    repository,
  });
  return branchesResponse;
}
