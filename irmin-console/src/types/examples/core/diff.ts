import { getRandomArrayElement } from '@/utils/getRandomArrayElement';

import { ChangeType, Diff } from '@/types/core/Diff';

import { collections } from './collections';
import { commits } from './commits';

/**
 * Get example {@link Diff} difference between two refs
 *
 * @param props - The props to generate the diff
 * @param props.amount - The amount of changes to generate (default: random 0 - 9)
 * @param props.repository - The repository the refs are in (default: example-repo)
 * @param props.base - The base ref (default: main)
 * @param props.compare - The ref to compare against (default: feature)
 *
 * @returns The generated diff
 */
export const diff = ({
  amount,
  repository,
  base,
  compare,
}: {
  amount?: number;
  repository?: string;
  base?: string;
  compare?: string;
} = {}): Diff => {
  const newCommits = commits();
  const allCollections = collections();
  // Use the provided amount or generate a random number of changes
  const amountOfChanges = amount ?? Math.floor(Math.random() * 15);
  // Generate diff items
  return {
    repository: repository ?? 'example-repo',
    base_ref: base ?? 'main',
    compare_ref: compare ?? 'feature',
    items: Array.from({ length: amountOfChanges }, () => ({
      collection: getRandomArrayElement(allCollections),
      type: getRandomArrayElement(Object.values(ChangeType)),
      size: Math.floor(Math.random() * 100000),
    })),
    commits: amountOfChanges > 0 ? newCommits.slice(0, 10) : [],
  };
};
