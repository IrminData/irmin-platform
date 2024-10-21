import { initCore } from '@/lib/initCore';

import { sortCommits } from '@/utils/sortCommits';

/**
 * Server action to get a list of commits in a repository at a specific ref.
 */
export async function getCommits(repository: string, ref?: string) {
  // Create the IrminCore instance
  const irminCore = await initCore();
  // Get the commits
  const res = await irminCore.commitService.fetchCommits(repository, ref);
  // Sort the commits by hash
  const sortedCommits = sortCommits(res.data ?? []);
  return sortedCommits;
}

/**
 * Server action to get a commit by hash.
 */
export async function getCommit(repository: string, hash: string) {
  // Create the IrminCore instance
  const irminCore = await initCore();
  // Get the commit
  const res = await irminCore.commitService.fetchCommit(repository, hash);
  return res.data;
}

/**
 * Server action to reate a commit in a repository.
 */
export async function createCommit(
  repositorySlug: string,
  currentRef: string,
  message: string
) {
  const irminCore = await initCore();
  const res = await irminCore.commitService.createCommit(
    repositorySlug,
    currentRef,
    message
  );
  return res;
}

/**
 * Server action to get last modification to a collection.
 */
export async function getLastModification(
  repositorySlug: string,
  currentRef: string,
  collection: string
) {
  const irminCore = await initCore();
  const res = await irminCore.commitService.fetchLastModification(
    repositorySlug,
    currentRef,
    collection
  );
  return res;
}

/**
 * Server action to revert uncommitted changes in a repository on a specific ref.
 */
export async function revertUncommittedChanges(
  repositorySlug: string,
  ref: string
) {
  const irminCore = await initCore();
  const res = await irminCore.commitService.revertUncommittedChanges(
    repositorySlug,
    ref
  );
  return res;
}
