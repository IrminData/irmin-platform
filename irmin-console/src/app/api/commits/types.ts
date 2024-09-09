import { Commit } from '@/types/internal/Commit';

/**
 * @typeParam commits - The fetched commits
 */
export interface CommitsResult {
  commits: Commit[];
}

/**
 * Response object type for the `GET /api/commits` route
 * @typeParam data - The fetched commits {@link CommitsResult}
 * @typeParam metadata - Additional data about the fetch
 * @typeParam metadata.errors - Errors that occurred during the fetch
 * @typeParam metadata.workspace - Slug of the workspace data was fetched for
 * @typeParam metadata.repository - Slug of the repository data was fetched for
 */
export interface CommitsResponse {
  data: CommitsResult;
  metadata: {
    errors: string[];
    workspace: string;
    repository: string;
    branch: string;
  };
}

/**
 * Empty {@link CommitsResponse} object to use as a base for the response
 */
export const emptyCommitsResponse: CommitsResponse = {
  data: {
    commits: [],
  },
  metadata: {
    errors: [],
    workspace: '',
    repository: '',
    branch: '',
  },
};
