'use server';

import { initCore } from '@/lib/initCore';

/**
 * Server action to get the list of collections. If no repository is provided,
 * fetch all collections. If no ref is provided, fetch the collections from the default branch.
 *
 * @param repository - (optional) slug of the repository to fetch collections for
 * @param ref - (optional) ref to fetch the collections from, eg. branch, tag, commit hash
 * @returns The list of collections
 */
export async function getCollections(repository?: string, ref?: string) {
  // Create the IrminCore instance
  const irminCore = await initCore();
  // Get the collections
  const collections = await irminCore.collectionService.fetchCollections(
    repository,
    ref
  );
  return collections.data;
}

/**
 * Server action to get a collection in a repository at a specific ref.
 *
 * @param repository - slug of the repository to fetch the collection from
 * @param ref - ref to fetch the collection from, eg. branch, tag, commit hash
 * @param collection - Name of the collection to fetch
 */
export async function deleteCollection(
  repository: string,
  ref: string,
  collection: string
) {
  // Create the IrminCore instance
  const irminCore = await initCore();
  // Delete the collection
  const res = await irminCore.collectionService.deleteCollection(
    repository,
    ref,
    collection
  );
  return res;
}

/**
 * Server action to get content of a collection in a repository at a specific ref.
 *
 * @param data - Collection content data
 * @param data.collection - Name of the collection to fetch
 * @param data.path - Path to fetch the content from
 * @param data.repository - Slug of the repository to fetch the collection from
 * @param data.ref - Ref to fetch the collection from, eg. branch, tag, commit hash
 */
export async function getCollectionContent(data: {
  collection?: string;
  path?: string;
  repository?: string;
  ref?: string;
}) {
  const irminCore = await initCore();
  const res = await irminCore.collectionService.fetchContent(data);
  return res;
}
