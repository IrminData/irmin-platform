'use server';

import { initCore } from '@/lib/initCore';

/**
 * Server action to get a list of branches in a repository.
 */
export async function getBranches(repository: string, token?: string) {
  // Create the IrminCore instance
  const irminCore = await initCore(token);
  // Get the branches
  const branches = await irminCore.branchService.fetchBranches(repository);
  return branches.data;
}

/**
 * Server action to get a branch in a repository.
 */
export async function getBranch(
  repository: string,
  branch: string,
  token?: string
) {
  // Create the IrminCore instance
  const irminCore = await initCore(token);
  // Get the branch
  const branchData = await irminCore.branchService.fetchBranch(
    repository,
    branch
  );
  return branchData.data;
}

/**
 * Server action to create a branch in a repository.
 */
export async function createBranch(
  repository: string,
  from: string,
  branch: string,
  token?: string
) {
  // Create the IrminCore instance
  const irminCore = await initCore(token);
  const res = await irminCore.branchService.createBranch(
    repository,
    from,
    branch
  );
  return res;
}

/**
 * Server acction to delete a branch in a repository.
 */
export async function deleteBranch(
  repository: string,
  branch: string,
  token?: string
) {
  // Create the IrminCore instance
  const irminCore = await initCore(token);
  const res = await irminCore.branchService.deleteBranch(repository, branch);
  return res;
}
