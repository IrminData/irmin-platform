'use server';

import { initCore } from '@/lib/initCore';

import { sortCommits } from '@/utils/sortCommits';

import { PathType } from '@/types/core/Commit';

/**
 * Server action to get a list of commits in a repository at a specific ref.
 *
 * @param workspace - The workspace to fetch the commits from
 * @param repository - The repository slug to fetch the commits from
 * @param ref - (Optional) The reference (branch, tag, etc.) to filter commits
 * @param token - Optional token for authentication
 * @returns The sorted list of commits
 */
export async function getCommits(
  workspace: string,
  repository: string,
  ref?: string,
  token?: string
) {
  const irminCore = await initCore(token);
  // Get the commits using updated service parameters
  const res = await irminCore.commitService.fetchCommits({
    workspace,
    repository,
    ref,
  });
  // Sort the commits by hash
  const sortedCommits = sortCommits(res.data ?? []);
  return sortedCommits;
}

/**
 * Server action to get a commit by hash.
 *
 * @param workspace - The workspace to fetch the commit from
 * @param repository - The repository slug to fetch the commit from
 * @param hash - The commit hash to fetch
 * @param token - Optional token for authentication
 * @returns The commit data
 */
export async function getCommit(
  workspace: string,
  repository: string,
  hash: string,
  token?: string
) {
  const irminCore = await initCore(token);
  // Get the commit using updated service parameters
  const res = await irminCore.commitService.fetchCommit({
    workspace,
    repository,
    hash,
  });
  return res.data;
}

/**
 * Server action to create a commit in a repository.
 *
 * @param workspace - The workspace to create the commit in
 * @param repository - The repository slug to create the commit in
 * @param branch - The current branch to create the commit on
 * @param message - The commit message
 * @param token - Optional token for authentication
 * @returns The response from commit creation
 */
export async function createCommit(
  workspace: string,
  repository: string,
  branch: string,
  message: string,
  token?: string
) {
  const irminCore = await initCore(token);
  // Create the commit using updated service parameters
  const res = await irminCore.commitService.createCommit({
    workspace,
    repository,
    branch,
    message,
  });
  return res;
}

/**
 * Server action to revert uncommitted changes in a repository on a specific ref.
 *
 * @param workspace - The workspace to revert changes in
 * @param repository - The repository slug to revert changes in
 * @param branch - The branch to revert changes on
 * @param path - The path to revert changes for
 * @param pathType - The type of the path
 * @param token - Optional token for authentication
 * @returns The response from the revert action
 */
export async function revertUncommittedChanges(
  workspace: string,
  repository: string,
  branch: string,
  path: string,
  pathType: PathType,
  token?: string
) {
  const irminCore = await initCore(token);
  // Revert uncommitted changes using updated service parameters
  const res = await irminCore.commitService.revertUncommittedChanges({
    workspace,
    repository,
    branch,
    path,
    pathType,
  });
  return res;
}
