import { getRandomArrayElement } from '@/utils/getRandomArrayElement';

import { Diff } from '@/types/core/Diff';

import { commits } from './commits';
import { objects } from './objects';

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
  const allObjects = objects();
  // Use the provided amount or generate a random number of changes
  const amountOfChanges = amount ?? Math.floor(Math.random() * 15);
  // Generate diff items
  return {
    repository: repository ?? 'example-repo',
    base_ref: base ?? 'main',
    compare_ref: compare ?? 'feature',
    items: Array.from({ length: amountOfChanges }, () => ({
      object: getRandomArrayElement(allObjects),
      type: getRandomArrayElement(
        Object.values(['added', 'removed', 'changed', 'conflict', 'moved'])
      ),
      size: Math.floor(Math.random() * 100000),
    })),
    commits: amountOfChanges > 0 ? newCommits.slice(0, 10) : [],
  };
};
