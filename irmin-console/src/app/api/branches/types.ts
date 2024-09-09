import { Branch } from '@/types/internal/Branch';

/**
 * @typeParam branches - The fetched branches for a repository
 */
export interface BranchesResult {
  branches: Branch[];
}

/**
 * Response object type for the `GET /api/branches` route
 * @typeParam data - The fetched branches {@link BranchesResult}
 * @typeParam metadata - Additional data about the fetch
 * @typeParam metadata.errors - Errors that occurred during the fetch
 * @typeParam metadata.workspace - Slug of the workspace data was fetched for
 * @typeParam metadata.repository - Slug of the repository data was fetched for
 */
export interface BranchesResponse {
  data: BranchesResult;
  metadata: {
    errors: string[];
    workspace: string;
    repository: string;
  };
}

/**
 * Empty {@link BranchesResponse} object to use as a base for the response
 */
export const emptyBranchesResponse: BranchesResponse = {
  data: {
    branches: [],
  },
  metadata: {
    errors: [],
    workspace: '',
    repository: '',
  },
};
