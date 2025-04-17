'use server';

import { initCore } from '@/lib/initCore';

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
