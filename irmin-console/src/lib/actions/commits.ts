'use server';

import { initCore } from '@/lib/initCore';

import { sortCommits } from '@/utils/sortCommits';

import { PathType } from '@/types/core/Commit';

/**
 * Server action to get a list of commits in a repository at a specific ref.
 *
 * @param props - The properties for the function.
 * @param props.workspace - The workspace to fetch the commits from
 * @param props.repository - The repository slug to fetch the commits from
 * @param props.ref - (Optional) The reference (branch, tag, etc.) to filter commits
 * @param props.token - Optional token for authentication
 * @returns The sorted list of commits
 */
export async function getCommits({
  workspace,
  repository,
  ref,
  token,
}: {
  workspace: string;
  repository: string;
  ref?: string;
  token?: string;
}) {
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
 * @param props - The properties for the function.
 * @param props.workspace - The workspace to fetch the commit from
 * @param props.repository - The repository slug to fetch the commit from
 * @param props.hash - The commit hash to fetch
 * @param props.token - Optional token for authentication
 * @returns The commit data
 */
export async function getCommit({
  workspace,
  repository,
  hash,
  token,
}: {
  workspace: string;
  repository: string;
  hash: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  // Get the commit using updated service parameters
  const res = await irminCore.commitService.fetchCommit({
    workspace,
    repository,
    hash,
  });
  return res;
}

/**
 * Server action to create a commit in a repository.
 *
 * @param props - The properties for the function.
 * @param props.workspace - The workspace to create the commit in
 * @param props.repository - The repository slug to create the commit in
 * @param props.branch - The current branch to create the commit on
 * @param props.message - The commit message
 * @param props.token - Optional token for authentication
 * @returns The response from commit creation
 */
export async function createCommit({
  workspace,
  repository,
  branch,
  message,
  token,
}: {
  workspace: string;
  repository: string;
  branch: string;
  message: string;
  token?: string;
}) {
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
 * @param props - The properties for the function.
 * @param props.workspace - The workspace to revert changes in
 * @param props.repository - The repository slug to revert changes in
 * @param props.branch - The branch to revert changes on
 * @param props.path - The path to revert changes for
 * @param props.pathType - The type of the path
 * @param props.token - Optional token for authentication
 * @returns The response from the revert action
 */
export async function revertUncommittedChanges({
  workspace,
  repository,
  branch,
  path,
  pathType,
  token,
}: {
  workspace: string;
  repository: string;
  branch: string;
  path: string;
  pathType: PathType;
  token?: string;
}) {
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
