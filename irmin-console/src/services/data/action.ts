import {
  ActionSingleRunRequest,
  ActionSingleRunResponse,
} from '@/app/api/action-single-run/types';
import { Locale } from '@/dictionaries';

/**
 * Service to call internal API endpoint to fetch results for an action once.
 *
 * `POST /api/action-single-run` route, which can be found in `src/app/api/action-single-run/route.ts`
 *
 * @param props0 - Proxy parameters
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
