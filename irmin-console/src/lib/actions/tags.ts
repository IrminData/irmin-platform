'use server';

import { initCore } from '@/lib/initCore';

/**
 * Get a list of tags in a repository.
 */
export async function getTags(repository: string) {
  // Create the IrminCore instance
  const irminCore = await initCore();
  // Get the tags
  const tags = await irminCore.tagService.fetchTags(repository);
  return tags.data;
}

/**
 * Create a tag in a repository.
 */
export async function createTag(
  repository: string,
  from: string,
  name: string
) {
  const irminCore = await initCore();
  const res = await irminCore.tagService.createTag(repository, from, name);
  return res;
}

/**
 * Delete a tag in a repository.
 */
export async function deleteTag(repository: string, tag: string) {
  const irminCore = await initCore();
  const res = await irminCore.tagService.deleteTag(repository, tag);
  return res;
}
