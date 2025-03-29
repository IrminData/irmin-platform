'use server';

import { initCore } from '@/lib/initCore';

import { ItemUpdateProps } from '@/types/internal/ItemUpdateProps';

/**
 * Server action to get all repositories for a workspace.
 *
 * @param workspace - The workspace slug.
 * @param token - Optional user token.
 * @returns The list of repositories.
 */
export async function getRepositories(workspace: string, token?: string) {
  const irminCore = await initCore(token);
  const repositories = await irminCore.repositoryService.fetchRepositories({
    workspace,
  });
  return repositories.data;
}

/**
 * Server action to fetch a single repository by its slug.
 *
 * @param workspace - The workspace slug.
 * @param repositorySlug - The repository slug.
 * @param token - Optional user token.
 * @returns The repository details.
 */
export async function getRepository(
  workspace: string,
  repositorySlug: string,
  token?: string
) {
  const irminCore = await initCore(token);
  const repository = await irminCore.repositoryService.fetchRepository({
    workspace,
    slug: repositorySlug,
  });
  return repository.data;
}

/**
 * Server action to create a new repository.
 *
 * @param workspace - The workspace slug.
 * @param name - The repository name.
 * @param description - The repository description.
 * @param documentation - The repository documentation.
 * @param default_branch - The default branch name.
 * @param isImmutable - Whether the repository is immutable.
 * @param garbageDefaultRetentionDays - The default retention days for garbage collection.
 * @param garbageDefaultBranchRetentionDays - The default retention days for garbage collection on the default branch.
 * @param token - Optional user token.
 * @returns The created repository.
 */
export async function createRepository(
  workspace: string,
  name: string,
  description: string,
  documentation: string,
  default_branch: string,
  isImmutable: boolean,
  garbageDefaultRetentionDays: number,
  garbageDefaultBranchRetentionDays: number,
  token?: string
) {
  const irminCore = await initCore(token);
  const res = await irminCore.repositoryService.createRepository({
    workspace,
    name,
    description,
    documentation,
    default_branch,
    isImmutable,
    garbageDefaultRetentionDays,
    garbageDefaultBranchRetentionDays,
  });
  return res;
}

/**
 * Server action to delete a repository.
 *
 * @param workspace - The workspace slug.
 * @param repositorySlug - The repository slug to delete.
 * @param token - Optional user token.
 * @returns The deletion result.
 */
export async function deleteRepository(
  workspace: string,
  repositorySlug: string,
  token?: string
) {
  const irminCore = await initCore(token);
  const res = await irminCore.repositoryService.deleteRepository({
    workspace,
    repositorySlug,
  });
  return res;
}

/**
 * Server action to update an existing repository.
 *
 * @param workspace - The workspace slug.
 * @param repositorySlug - The repository slug to update.
 * @param name - The new repository name.
 * @param description - The new repository description.
 * @param documentation - The new repository documentation.
 * @param isImmutable - Whether the repository is immutable.
 * @param garbageDefaultRetentionDays - The new retention days for garbage collection.
 * @param garbageDefaultBranchRetentionDays - The new retention days for garbage collection on the default branch.
 * @param token - Optional user token.
 * @returns The updated repository.
 */
export async function updateRepository(
  workspace: string,
  repositorySlug: string,
  name?: string,
  description?: string,
  documentation?: string,
  isImmutable?: boolean,
  garbageDefaultRetentionDays?: number,
  garbageDefaultBranchRetentionDays?: number,
  token?: string
) {
  const irminCore = await initCore(token);
  const res = await irminCore.repositoryService.updateRepository({
    workspace,
    slug: repositorySlug,
    name,
    description,
    documentation,
    isImmutable,
    garbageDefaultRetentionDays,
    garbageDefaultBranchRetentionDays,
  });
  return res;
}

/**
 * Server action to transfer a repository to a different owner.
 *
 * @param workspace - The workspace slug.
 * @param repositorySlug - The repository slug.
 * @param ownerID - The new owner's ID.
 * @param token - Optional user token.
 * @returns The repository with updated ownership.
 */
export async function transferRepository(
  workspace: string,
  repositorySlug: string,
  ownerID: string,
  token?: string
) {
  const irminCore = await initCore(token);
  const res = await irminCore.repositoryService.transferRepository({
    workspace,
    slug: repositorySlug,
    newOwnerID: ownerID,
  });
  return res;
}

/**
 * Server action to get a download link for a repository.
 *
 * @param workspace - The workspace slug.
 * @param repositorySlug - The repository slug.
 * @param ref - The ref (branch, tag, or commit hash) to download.
 * @param path - The path to download.
 * @param token - Optional user token.
 * @returns An object containing the download URL.
 */
export async function getRepositoryDownloadLink(
  workspace: string,
  repositorySlug: string,
  ref: string,
  path: string,
  token?: string
) {
  const irminCore = await initCore(token);
  const res = await irminCore.repositoryService.getRepositoryDownloadLink({
    workspace,
    repositorySlug,
    ref,
    path,
  });
  return res;
}
