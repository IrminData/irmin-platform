import { WorkspaceProxyResponse } from '@/app/api/workspace/types';
import { Locale } from '@/dictionaries';

/**
 * Proxy service to fetch the {@link WorkspaceProxyResponse} from Core Irmin API through an API route
 *
 * `GET /api/workspace` route, which can be found in `src/app/api/workspace/route.ts`
 *
 * @param props0 - Proxy parameters
 * @param props0.locale - The locale to use for the request
 * @param props0.token - The API token to use for the request
 * @param props0.workspace - The slug of the workspace to fetch data for
 *
 * @returns Core Irmin API response or an error
 */
export const fetchWorkspaceProxy = async ({
  locale,
  token,
  workspace,
}: {
  locale: Locale;
  token: string;
  workspace: string;
}): Promise<WorkspaceProxyResponse> => {
  const response = await fetch('/api/workspace', {
    headers: {
      'Accept-Language': locale,
      Authorization: `Bearer ${token}`,
      Workspace: workspace,
    },
  }).then((res) => res.json());
  return response as WorkspaceProxyResponse;
};
