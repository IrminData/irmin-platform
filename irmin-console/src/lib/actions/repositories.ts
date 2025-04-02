'use server';

import { initCore } from '@/lib/initCore';

/**
 * Server action to get all repositories for a workspace.
 *
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
 * Server action to create a new repository.
 *
 * @param props.workspace - The workspace slug.
 * @param props.name - The repository name.
 * @param props.description - The repository description.
 * @param props.documentation - The repository documentation.
 * @param props.default_branch - The default branch name.
 * @param props.isImmutable - Whether the repository is immutable.
 * @param props.garbageDefaultRetentionDays - The default retention days for garbage collection.
 * @param props.garbageDefaultBranchRetentionDays - The default retention days for garbage collection on the default branch.
 * @param props.token - Optional user token.
 * @returns The created repository.
 */
export async function createRepository({
  workspace,
  name,
  description,
  documentation,
  default_branch,
  isImmutable,
  garbageDefaultRetentionDays,
  garbageDefaultBranchRetentionDays,
  token,
}: {
  workspace: string;
  name: string;
  description: string;
  documentation: string;
  default_branch: string;
  isImmutable: boolean;
  garbageDefaultRetentionDays?: number;
  garbageDefaultBranchRetentionDays?: number;
  token?: string;
}) {
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
 * @param props.workspace - The workspace slug.
 * @param props.repositorySlug - The repository slug to delete.
 * @param props.token - Optional user token.
 * @returns The deletion result.
 */
export async function deleteRepository({
  workspace,
  repositorySlug,
  token,
}: {
  workspace: string;
  repositorySlug: string;
  token?: string;
}) {
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
 * @param props.workspace - The workspace slug.
 * @param props.repositorySlug - The repository slug to update.
 * @param props.name - The new repository name.
 * @param props.description - The new repository description.
 * @param props.documentation - The new repository documentation.
 * @param props.isImmutable - Whether the repository is immutable.
 * @param props.garbageDefaultRetentionDays - The new retention days for garbage collection.
 * @param props.garbageDefaultBranchRetentionDays - The new retention days for garbage collection on the default branch.
 * @param props.token - Optional user token.
 * @returns The updated repository.
 */
export async function updateRepository({
  workspace,
  repositorySlug,
  name,
  description,
  documentation,
  isImmutable,
  garbageDefaultRetentionDays,
  garbageDefaultBranchRetentionDays,
  token,
}: {
  workspace: string;
  repositorySlug: string;
  name?: string;
  description?: string;
  documentation?: string;
  isImmutable?: boolean;
  garbageDefaultRetentionDays?: number;
  garbageDefaultBranchRetentionDays?: number;
  token?: string;
}) {
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
 * @param props.workspace - The workspace slug.
 * @param props.repositorySlug - The repository slug.
 * @param props.ownerID - The new owner's ID.
 * @param props.token - Optional user token.
 * @returns The repository with updated ownership.
 */
export async function transferRepository({
  workspace,
  repositorySlug,
  ownerID,
  token,
}: {
  workspace: string;
  repositorySlug: string;
  ownerID: string;
  token?: string;
}) {
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
 * @param props.workspace - The workspace slug.
 * @param props.repositorySlug - The repository slug.
 * @param props.ref - The ref (branch, tag, or commit hash) to download.
 * @param props.path - The path to download.
 * @param props.token - Optional user token.
 * @returns An object containing the download URL.
 */
export async function getRepositoryDownloadLink({
  workspace,
  repositorySlug,
  ref,
  path,
  token,
}: {
  workspace: string;
  repositorySlug: string;
  ref: string;
  path: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  const res = await irminCore.repositoryService.getRepositoryDownloadLink({
    workspace,
    repositorySlug,
    ref,
    path,
  });
  return res;
}
