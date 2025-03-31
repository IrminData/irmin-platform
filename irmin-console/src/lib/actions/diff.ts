'use server';

import { initCore } from '@/lib/initCore';

import { MergeStrategy } from '@/types/core/Diff';

/**
 * Server action to get a diff between two refs in a repository.
 *
 * @param props.workspace - The workspace slug.
 * @param props.repository - The repository slug.
 * @param props.baseRef - The base reference.
 * @param props.compareRef - The reference to compare.
 * @param props.token - Optional token for authentication.
 * @returns The API response containing the diff.
 */
export async function getDiff({
  workspace,
  repository,
  baseRef,
  compareRef,
  token,
}: {
  workspace: string;
  repository: string;
  baseRef: string;
  compareRef: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  // Get the diff using updated service parameters
  const res = await irminCore.diffService.compareRefs({
    workspace,
    repository,
    baseRef,
    compareRef,
  });
  return res;
}

/**
 * Server action to merge refs in a repository.
 *
 * @param props.workspace - The workspace slug.
 * @param props.repository - The repository slug.
 * @param props.baseRef - The base reference.
 * @param props.compareRef - The reference to merge from.
 * @param props.description - The merge commit description.
 * @param props.mergeStrategy - The merge strategy.
 * @param props.squash - Whether to squash changes.
 * @param props.allowEmpty - Whether to allow an empty merge.
 * @param props.token - Optional token for authentication.
 * @returns The API response containing the merge commit.
 */
export async function mergeRefs({
  workspace,
  repository,
  baseRef,
  compareRef,
  description,
  mergeStrategy,
  squash,
  allowEmpty,
  token,
}: {
  workspace: string;
  repository: string;
  baseRef: string;
  compareRef: string;
  description: string;
  mergeStrategy: MergeStrategy;
  squash: boolean;
  allowEmpty: boolean;
  token?: string;
}) {
  const irminCore = await initCore(token);
  // Merge refs using updated service parameters
  const res = await irminCore.diffService.mergeRefs({
    workspace,
    repository,
    baseRef,
    compareRef,
    description,
    mergeStrategy,
    squash,
    allowEmpty,
  });
  return res;
}
