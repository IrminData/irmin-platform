'use server';

import { initCore } from '@/lib/initCore';

/**
 * Server action to get a diff between two refs in a repository.
 */
export async function getDiff(
  repository: string,
  ref: string,
  compareRef: string
) {
  const irminCore = await initCore();
  const res = await irminCore.diffService.compareRefs(
    repository,
    ref,
    compareRef
  );
  return res;
}

/**
 * Server action to merge refs in a repository.
 */
export async function mergeRefs(
  repository: string,
  base: string,
  compare: string,
  description: string,
  strategy: string
) {
  const irminCore = await initCore();
  const res = await irminCore.diffService.mergeRefs(
    repository,
    base,
    compare,
    description,
    strategy
  );
  return res;
}
