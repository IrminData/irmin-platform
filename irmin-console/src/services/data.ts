import {
  ActionSingleRunRequest,
  ActionSingleRunResponse,
} from '@/app/api/action-single-run/types';
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
export const fetchSingle = async ({
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
export const fetchSchema = async ({
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
