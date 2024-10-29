'use server';

import { initCore } from '@/lib/initCore';

import { ItemUpdateProps } from '@/types/internal/ItemUpdateProps';

/**
 * Server action to get all repositories for the current workspace.
 */
export async function getRepositories(token?: string) {
  const irminCore = await initCore(token);
  const repositories = await irminCore.repositoryService.fetchRepositories();
  return repositories.data;
}

/**
 * Server action to fetch a single repository by slug.
 */
export async function getRepository(repositorySlug: string, token?: string) {
  const irminCore = await initCore(token);
  const repositories =
    await irminCore.repositoryService.fetchRepository(repositorySlug);
  return repositories.data;
}

/**
 * Server action to create a new repository.
 *
 * @param repository - The repository data to create.
 * @returns The API response from the server.
 */
export async function createRepository(
  repository: ItemUpdateProps,
  token?: string
) {
  const irminCore = await initCore(token);
  const res = await irminCore.repositoryService.createRepository(repository);
  return res;
}

/**
 * Server action to delete a repository.
 *
 * @param repositorySlug - The repository slug to delete.
 * @returns The API response from the server.
 */
export async function deleteRepository(repositorySlug: string, token?: string) {
  const irminCore = await initCore(token);
  const res =
    await irminCore.repositoryService.deleteRepository(repositorySlug);
  return res;
}

/**
 * Server action to update a repository.
 *
 * @param repositorySlug - The repository slug to update.
 * @param data - The repository data to update.
 */
export async function updateRepository(
  repositorySlug: string,
  data: ItemUpdateProps,
  token?: string
) {
  const irminCore = await initCore(token);
  const res = await irminCore.repositoryService.updateRepository(
    repositorySlug,
    data
  );
  return res;
}

/**
 * Server action to reassign a repository to a different owner.
 */
export async function reassignRepository(
  repositorySlug: string,
  ownerID: string,
  token?: string
) {
  const irminCore = await initCore(token);
  const res = await irminCore.repositoryService.reassignRepository(
    repositorySlug,
    ownerID
  );
  return res;
}
