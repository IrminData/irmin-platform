'use server';

import { initCore } from '@/lib/initCore';

/**
 * Server action to get a list of branches in a repository.
 *
 * @param workspace - The workspace to fetch the branches from
 * @param repository - The repository slug to fetch the branches from
 * @param token - Optional token for authentication
 * @returns The list of branches
 */
export async function getBranches(
  workspace: string,
  repository: string,
  token?: string
) {
  const irminCore = await initCore(token);
  // Get the branches
  const branchesResponse = await irminCore.branchService.fetchBranches({
    workspace,
    repository,
  });
  return branchesResponse.data;
}

/**
 * Server action to get a branch in a repository.
 *
 * @param workspace - The workspace to fetch the branch from
 * @param repository - The repository slug to fetch the branch from
 * @param branch - The branch name to fetch
 * @param token - Optional token for authentication
 * @returns The branch data
 */
export async function getBranch(
  workspace: string,
  repository: string,
  branch: string,
  token?: string
) {
  const irminCore = await initCore(token);
  // Get the branch
  const branchResponse = await irminCore.branchService.fetchBranch({
    workspace,
    repository,
    branch,
  });
  return branchResponse.data;
}

/**
 * Server action to create a branch in a repository.
 *
 * @param workspace - The workspace to create the branch in
 * @param repository - The repository slug to create the branch in
 * @param from - The branch to create the new branch from
 * @param name - The name of the new branch
 * @param token - Optional token for authentication
 * @returns The response from branch creation
 */
export async function createBranch(
  workspace: string,
  repository: string,
  from: string,
  name: string,
  token?: string
) {
  const irminCore = await initCore(token);
  // Create the branch
  const response = await irminCore.branchService.createBranch({
    workspace,
    repository,
    name,
    from,
  });
  return response;
}

/**
 * Server action to delete a branch in a repository.
 *
 * @param workspace - The workspace to delete the branch from
 * @param repository - The repository slug to delete the branch from
 * @param branch - The branch name to delete
 * @param token - Optional token for authentication
 * @returns The response from branch deletion
 */
export async function deleteBranch(
  workspace: string,
  repository: string,
  branch: string,
  token?: string
) {
  const irminCore = await initCore(token);
  // Delete the branch
  const response = await irminCore.branchService.deleteBranch({
    workspace,
    repository,
    branch,
  });
  return response;
}
