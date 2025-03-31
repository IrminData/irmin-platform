'use server';

import { initCore } from '@/lib/initCore';

/**
 * Server action to get a list of tags in a repository.
 *
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
 * Server action to get a tag from a repository.
 *
 * @param props.workspace - The workspace slug.
 * @param props.repository - The repository slug.
 * @param props.tagID - The tag identifier.
 * @param props.token - Optional user token.
 * @returns The tag data.
 */
export async function getTag({
  workspace,
  repository,
  tagID,
  token,
}: {
  workspace: string;
  repository: string;
  tagID: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  const tag = await irminCore.tagService.fetchTag({
    workspace,
    repository,
    tag: tagID,
  });
  return tag;
}

/**
 * Server action to create a tag in a repository.
 *
 * @param props.workspace - The workspace slug.
 * @param props.repository - The repository slug.
 * @param props.name - The name of the tag.
 * @param props.ref - The ref to create the tag from.
 * @param props.token - Optional user token.
 * @returns The created tag.
 */
export async function createTag({
  workspace,
  repository,
  name,
  ref,
  token,
}: {
  workspace: string;
  repository: string;
  name: string;
  ref: string;
  token?: string;
}) {
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
 * @param props.workspace - The workspace slug.
 * @param props.repository - The repository slug.
 * @param props.tagID - The tag identifier.
 * @param props.token - Optional user token.
 * @returns The deletion result.
 */
export async function deleteTag({
  workspace,
  repository,
  tagID,
  token,
}: {
  workspace: string;
  repository: string;
  tagID: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  const res = await irminCore.tagService.deleteTag({
    workspace,
    repository,
    tag: tagID,
  });
  return res;
}
