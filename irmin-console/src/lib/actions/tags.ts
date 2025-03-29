'use server';

import { initCore } from '@/lib/initCore';

/**
 * Server action to get a list of tags in a repository.
 *
 * @param workspace - The workspace slug.
 * @param repository - The repository slug.
 * @param token - Optional user token.
 * @returns The list of tags.
 */
export async function getTags(
  workspace: string,
  repository: string,
  token?: string
) {
  const irminCore = await initCore(token);
  const tags = await irminCore.tagService.fetchTags({ workspace, repository });
  return tags.data;
}

/**
 * Server action to get a tag from a repository.
 *
 * @param workspace - The workspace slug.
 * @param repository - The repository slug.
 * @param tagID - The tag identifier.
 * @param token - Optional user token.
 * @returns The tag data.
 */
export async function getTag(
  workspace: string,
  repository: string,
  tagID: string,
  token?: string
) {
  const irminCore = await initCore(token);
  const tag = await irminCore.tagService.fetchTag({
    workspace,
    repository,
    tag: tagID,
  });
  return tag.data;
}

/**
 * Server action to create a tag in a repository.
 *
 * @param workspace - The workspace slug.
 * @param repository - The repository slug.
 * @param name - The name of the tag.
 * @param ref - The ref to create the tag from.
 * @param token - Optional user token.
 * @returns The created tag.
 */
export async function createTag(
  workspace: string,
  repository: string,
  name: string,
  ref: string,
  token?: string
) {
  const irminCore = await initCore(token);
  const res = await irminCore.tagService.createTag({
    workspace,
    repository,
    name,
    ref,
  });
  return res;
}

/**
 * Server action to delete a tag in a repository.
 *
 * @param workspace - The workspace slug.
 * @param repository - The repository slug.
 * @param tagID - The tag identifier.
 * @param token - Optional user token.
 * @returns The deletion result.
 */
export async function deleteTag(
  workspace: string,
  repository: string,
  tagID: string,
  token?: string
) {
  const irminCore = await initCore(token);
  const res = await irminCore.tagService.deleteTag({
    workspace,
    repository,
    tag: tagID,
  });
  return res;
}
