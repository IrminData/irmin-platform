'use server';

import { initCore } from '@/lib/initCore';

/**
 * Server action to get a list of tags in a repository.
 */
export async function getTags(repository: string, token?: string) {
  // Create the IrminCore instance
  const irminCore = await initCore(token);
  // Get the tags
  const tags = await irminCore.tagService.fetchTags(repository);
  return tags.data;
}

/**
 * Server action to get a tag from a repository.
 */
export async function getTag(
  repository: string,
  tagID: string,
  token?: string
) {
  // Create the IrminCore instance
  const irminCore = await initCore(token);
  const tag = await irminCore.tagService.fetchTag(tagID, repository);
  return tag.data;
}

/**
 * Server action to create a tag in a repository.
 */
export async function createTag(
  repository: string,
  from: string,
  name: string,
  token?: string
) {
  // Create the IrminCore instance
  const irminCore = await initCore(token);
  const res = await irminCore.tagService.createTag(repository, from, name);
  return res;
}

/**
 * Server action to update a tag in a repository.
 */
export async function updateTag(
  repository: string,
  tagID: string,
  name?: string,
  ref?: string,
  token?: string
) {
  // Create the IrminCore instance
  const irminCore = await initCore(token);
  const res = await irminCore.tagService.updateTag(
    repository,
    tagID,
    name,
    ref
  );
  return res;
}

/**
 * Server action to delete a tag in a repository.
 */
export async function deleteTag(
  repository: string,
  tagID: string,
  token?: string
) {
  // Create the IrminCore instance
  const irminCore = await initCore(token);
  const res = await irminCore.tagService.deleteTag(repository, tagID);
  return res;
}
