import { BucketProxyResponse } from '@/app/api/bucket/types';
import { Locale } from '@/dictionaries';

/**
 * Proxy service to fetch the {@link BucketProxyResponse} from Core Irmin API through an API route
 *
 * `GET /api/bucket` route, which can be found in `src/app/api/bucket/route.ts`
 *
 * @param props0 - Proxy parameters
 * @param props0.locale - The locale to use for the request
 * @param props0.token - The API token to use for the request
 * @param props0.workspace - The slug of the workspace to fetch the bucket for
 *
 * @returns Core Irmin API response or an error
 */
export const fetchBucketProxy = async ({
  locale,
  token,
  workspace,
}: {
  locale: Locale;
  token: string;
  workspace: string;
}): Promise<BucketProxyResponse> => {
  const response = await fetch('/api/bucket', {
    headers: {
      'Accept-Language': locale,
      Authorization: `Bearer ${token}`,
      Workspace: workspace,
    },
  }).then((res) => res.json());
  return response as BucketProxyResponse;
};
