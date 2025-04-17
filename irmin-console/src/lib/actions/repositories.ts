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
