import { IrminAPIResponse } from '@/types/api/IrminAPIResponse';

/**
 * Fetch data from the API with credentials
 * @param {string} url - The URL to fetch data from
 * @param {RequestInit} options - The fetch options
 * @param {string} locale - The locale to use for the request
 * @returns {Promise<IrminAPIResponse>}
 * {@link https://api.irmin.dev/docs#introduction Irmin API docs}
 */
export const fetchWithCredentials = async (
  url: string,
  options: RequestInit,
  locale?: string
): Promise<IrminAPIResponse> => {
  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'include', // Include credentials with every request
      headers: {
        Accept: 'application/json',
        'Accept-Language': locale ?? 'en',
        Referer: window.location.origin,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Request failed');
    }

    return response.json();
  } catch (error) {
    throw error;
  }
};
