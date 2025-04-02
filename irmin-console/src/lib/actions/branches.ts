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

/**
 * Server action to get a branch in a repository.
 *
 * @param props - The properties for the function
 * @param props.workspace - The workspace to fetch the branch from
 * @param props.repository - The repository slug to fetch the branch from
 * @param props.branch - The branch name to fetch
 * @param props.token - Optional token for authentication
 * @returns The branch data
 */
export async function getBranch({
  workspace,
  repository,
  branch,
  token,
}: {
  workspace: string;
  repository: string;
  branch: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  // Get the branch
  const branchResponse = await irminCore.branchService.fetchBranch({
    workspace,
    repository,
    branch,
  });
  return branchResponse;
}

/**
 * Server action to create a branch in a repository.
 *
 * @param props - The properties for the function
 * @param props.workspace - The workspace to create the branch in
 * @param props.repository - The repository slug to create the branch in
 * @param props.name - The branch name to create
 * @param props.from - The branch to create from
 * @param props.token - Optional token for authentication
 * @returns The response from branch creation
 */
export async function createBranch({
  workspace,
  repository,
  name,
  from,
  token,
}: {
  workspace: string;
  repository: string;
  name: string;
  from: string;
  token?: string;
}) {
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
 * @param props - The properties for the function
 * @param props.workspace - The workspace to delete the branch from
 * @param props.repository - The repository slug to delete the branch from
 * @param props.branch - The branch name to delete
 * @param props.token - Optional token for authentication
 * @returns The response from branch deletion
 */
export async function deleteBranch({
  workspace,
  repository,
  branch,
  token,
}: {
  workspace: string;
  repository: string;
  branch: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  // Delete the branch
  const response = await irminCore.branchService.deleteBranch({
    workspace,
    repository,
    branch,
  });
  return response;
}
