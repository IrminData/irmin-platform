import { Locale } from '@/dictionaries';
import { RolesAPIResponse } from '@/services/api/UserAndRoleService';

import { exampleAPIResponse, exampleRoles } from '@/types/examples/apiObjects';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment =
  process.env.NEXT_PUBLIC_ENVIRONMENT_TYPE === 'development';

/**
 * Fetch roles from the Irmin API through a Next.js API route
 *
 * @param props0 - The fetchRoles parameters
 * @param props0.locale - The locale to use for the request
 * @param props0.token - The API token to use for the request
 *
 * @returns The Irmin API response or an error
 */
export const fetchRoles = async ({
  locale,
  token,
}: {
  locale: Locale;
  token: string;
}): Promise<RolesAPIResponse> => {
  if (isOfflineMode) return { ...exampleAPIResponse, data: exampleRoles };
  try {
    const url = '/api/roles';
    const headers = {
      'Accept-Language': locale,
      Authorization: `Bearer ${token}`,
    };
    const response: RolesAPIResponse = await fetch(url, { headers }).then(
      (res) => res.json()
    );
    return response;
  } catch (error) {
    console.error('Error fetching roles via API proxy:', error);
    if (isDevelopment) return { ...exampleAPIResponse, data: exampleRoles };
    throw error;
  }
};
