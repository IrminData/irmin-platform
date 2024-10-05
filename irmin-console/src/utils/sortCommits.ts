import { Commit } from '@/types/core/Commit';

/**
 * Sorts a list of commits in chronological order using the previous_hash field.
 *
 * @param commits - The list of commits to sort.
 * @returns The sorted list of commits in chronological order.
 */
export const sortCommits = (commits: Commit[]): Commit[] => {
  // Make sure commits is not an empty array
  if (commits.length === 0) return [];

  // Create a map from hash to commit for quick lookup
  const hashToCommit: { [hash: string]: Commit } = {};
  commits.forEach((commit) => {
    hashToCommit[commit.hash] = commit;
  });

  // Identify the head commit (the one whose hash is not a previous_hash in any other commit)
  const previous_hashes = new Set(
    commits.map((commit) => commit.previous_hash)
  );
  const headCommits = commits.filter(
    (commit) => !previous_hashes.has(commit.hash)
  );

  // Validate head commits
  if (headCommits.length === 0) {
    throw new Error(
      'No head commit found. The commit chain might be circular or incomplete.'
    );
  } else if (headCommits.length > 1) {
    throw new Error(
      'Multiple head commits found. The commit chain might have diverged.'
    );
  }

  // Starting from the head commit, build the sorted array by following previous_hash links
  const sortedCommits: Commit[] = [];
  let currentCommit: Commit | undefined = headCommits[0];

  while (currentCommit) {
    sortedCommits.push(currentCommit);
    const nextHash: string | undefined = currentCommit.previous_hash;

    // Check if nextHash is valid before looking it up
    if (!nextHash || !hashToCommit[nextHash]) {
      break; // Exit if no valid next hash is found
    }

    currentCommit = hashToCommit[nextHash];
  }

  return sortedCommits;
};
