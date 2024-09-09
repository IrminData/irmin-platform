import {
  ActionSingleRunRequest,
  ActionSingleRunResponse,
} from '@/app/api/action-single-run/types';
import { BranchesResponse } from '@/app/api/branches/types';
import { CommitsResponse } from '@/app/api/commits/types';
import { SchemaResponse } from '@/app/api/schema/types';
import { Locale } from '@/dictionaries';

/**
 * Service to call internal API endpoint to fetch results for an action once.
 *
 * `POST /api/action-single-run` route, which can be found in `src/app/api/action-single-run/route.ts`
 *
 * @param props0 - Request parameters
 * @param props0.locale - The locale to use for the request
 * @param props0.token - The API token to use for the request
 * @param props0.workspace - The slug of the workspace to run the action on
 *
 * @returns {ActionSingleRunResponse} object
 */
export const fetchSingleService = async ({
  locale,
  token,
  workspace,
  request,
}: {
  locale: Locale;
  token: string;
  workspace: string;
  request: ActionSingleRunRequest;
}): Promise<ActionSingleRunResponse> => {
  const response = await fetch('/api/action-single-run', {
    method: 'POST',
    body: JSON.stringify(request),
    headers: {
      'Accept-Language': locale,
      Authorization: `Bearer ${token}`,
      Workspace: workspace,
    },
  }).then((res) => res.json());
  return response as ActionSingleRunResponse;
};

/**
 * Service to call internal API endpoint to fetch schema for a collection of tables.
 *
 * `GET /api/schema` route, which can be found in `src/app/api/schema/route.ts`
 *
 * @param props0 - Request parameters
 * @param props0.locale - The locale to use for the request
 * @param props0.token - The API token to use for the request
 * @param props0.workspace - The slug of the workspace to run the action on
 * @param props0.tables - The list of tables to fetch the schema for
 */
export const fetchSchemaService = async ({
  locale,
  token,
  workspace,
  tables,
}: {
  locale: Locale;
  token: string;
  workspace: string;
  tables: string[];
}): Promise<SchemaResponse> => {
  const urlParams = new URLSearchParams();
  tables.forEach((table) => urlParams.append('table', table));
  const response = await fetch(`/api/schema?${urlParams.toString()}`, {
    method: 'GET',
    headers: {
      'Accept-Language': locale,
      Authorization: `Bearer ${token}`,
      Workspace: workspace,
    },
  }).then((res) => res.json());
  return response as SchemaResponse;
};

/**
 * Service to call internal API endpoint to fetch branches for a repository.
 *
 * `GET /api/branches` route, which can be found in `src/app/api/branches/route.ts`
 *
 * @param props0 - Request parameters
 * @param props0.locale - The locale to use for the request
 * @param props0.token - The API token to use for the request
 * @param props0.workspace - The slug of the workspace to run the action on
 * @param props0.repository - The slug of the repository to fetch the branches for
 */
export const fetchBranchesService = async ({
  locale,
  token,
  workspace,
  repository,
}: {
  locale: Locale;
  token: string;
  workspace: string;
  repository: string;
}): Promise<BranchesResponse> => {
  const urlParams = new URLSearchParams();
  urlParams.append('repository', repository);
  const response = await fetch(`/api/branches?${urlParams.toString()}`, {
    method: 'GET',
    headers: {
      'Accept-Language': locale,
      Authorization: `Bearer ${token}`,
      Workspace: workspace,
    },
  }).then((res) => res.json());
  return response as BranchesResponse;
};

/**
 * Service to call internal API endpoint to fetch commits for a repository branch.
 *
 * `GET /api/commits` route, which can be found in `src/app/api/commits/route.ts`
 *
 * @param props0 - Request parameters
 * @param props0.locale - The locale to use for the request
 * @param props0.token - The API token to use for the request
 * @param props0.workspace - The slug of the workspace to run the action on
 * @param props0.repository - The slug of the repository to fetch the commits for
 * @param props0.branch - The name of the branch to fetch the commits for
 */
export const fetchCommitsService = async ({
  locale,
  token,
  workspace,
  repository,
  branch,
}: {
  locale: Locale;
  token: string;
  workspace: string;
  repository: string;
  branch: string;
}): Promise<CommitsResponse> => {
  const urlParams = new URLSearchParams();
  urlParams.append('repository', repository);
  urlParams.append('branch', branch);
  const response = await fetch(`/api/commits?${urlParams.toString()}`, {
    method: 'GET',
    headers: {
      'Accept-Language': locale,
      Authorization: `Bearer ${token}`,
      Workspace: workspace,
    },
  }).then((res) => res.json());
  return response as CommitsResponse;
};
