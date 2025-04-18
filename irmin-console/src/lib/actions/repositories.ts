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

/**
 * Server action to fetch a single repository by its slug.
 *
 * @param props - The properties for the function.
 * @param props.workspace - The workspace slug.
 * @param props.repositorySlug - The repository slug.
 * @param props.token - Optional user token.
 * @returns The repository details.
 */
export async function getRepository({
  workspace,
  repositorySlug,
  token,
}: {
  workspace: string;
  repositorySlug: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  const repository = await irminCore.repositoryService.fetchRepository({
    workspace,
    slug: repositorySlug,
  });
  return repository;
}

/**
 * Server action to get a list of tags in a repository.
 *
 * @param props - The properties for the function.
 * @param props.workspace - The workspace slug.
 * @param props.repository - The repository slug.
 * @param props.token - Optional user token.
 * @returns The list of tags.
 */
export async function getTags({
  workspace,
  repository,
  token,
}: {
  workspace: string;
  repository: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  const tags = await irminCore.tagService.fetchTags({ workspace, repository });
  return tags;
}

/**
 * Server action to get a list of branches in a repository.
 *
 * @param props - The properties for the function.
 * @param props.workspace - The workspace slug.
 * @param props.repository - The repository slug.
 * @param props.branch - The branch name to get commits on (optional).
 * @param props.token - Optional user token.
 * @returns The list of branches.
 */
export async function getCommits({
  workspace,
  repository,
  branch,
  token,
}: {
  workspace: string;
  repository: string;
  branch?: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  const commits = await irminCore.commitService.fetchCommits({
    workspace,
    repository,
    ref: branch,
  });
  return commits;
}

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
 * Get a single object at a given path.
 *
 * @param props - The properties for the function.
 * @param props.workspace - The workspace slug.
 * @param props.repository - The repository slug.
 * @param props.path - The path of the object.
 * @param props.ref - (optional) The ref (branch, tag or commit hash).
 * @param props.token - Optional user token.
 * @returns The object details.
 */
export async function getObject({
  workspace,
  repository,
  path,
  ref,
  token,
}: {
  workspace: string;
  repository: string;
  path: string;
  ref?: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  const res = await irminCore.objectService.getObjectAtPath({
    workspace,
    repository,
    path,
    ref,
  });
  return res;
}
