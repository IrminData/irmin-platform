import ProfileService from '@/irmin-api/profile';
import type {
  IrminAPIBinaryResponse,
  IrminAPIResponse,
} from '@/irmin-api/types/IrminAPIResponse';
import WorkspaceService from '@/irmin-api/workspace';

import { env } from '@/config/env';

/**
 * Simplified Core API client for Irmin AI.
 *
 * This class provides basic functionality to communicate with the Irmin Core API.
 * It handles authentication, request formatting, and response parsing.
 */
class IrminCore {
  private token: string;

  public apiBase = env.IRMIN_API_BASE_URL + '/api';

  public profileService: ProfileService;
  public workspaceService: WorkspaceService;

  /**
   * Creates an instance of IrminCore.
   *
   * @param apiToken - The API token for authentication.
   */
  constructor(apiToken: string) {
    this.token = apiToken || '';

    this.profileService = new ProfileService(this);
    this.workspaceService = new WorkspaceService(this);
  }

  /**
   * Internal fetch method to call the Irmin API.
   *
   * @param url - The API endpoint URL.
   * @param options - Request options for the fetch call.
   * @returns A promise that resolves with the response.
   */
  private _fetch = async (
    url: string,
    options: RequestInit,
    retries: number = 2
  ): Promise<Response> => {
    const requestOptions: RequestInit = {
      credentials: 'include',
      ...options,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${this.token}`,
        ...options.headers,
      },
    };

    const requestURL = `${this.apiBase}${url}`;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetch(requestURL, requestOptions);
        return response;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown fetch error';

        // If this is the last attempt, throw the error
        if (attempt === retries - 1) {
          throw new Error(`fetch failed ${errorMessage}`);
        }

        // Wait before retrying (exponential backoff)
        const delay = Math.pow(2, attempt) * 50; // 50ms, 100ms
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error('fetch failed after all retries');
  };

  /**
   * Fetch data from the Irmin API and check allowed status codes.
   *
   * @param url - The API endpoint URL.
   * @param options - Request options for the fetch call.
   * @param allowedStatusCodes - An optional list of allowed status codes.
   * @returns A promise that resolves with the parsed API response.
   */
  public fetchAPI = async (
    url: string,
    options: RequestInit,
    allowedStatusCodes?: number[]
  ): Promise<IrminAPIResponse> => {
    const response = await this._fetch(url, options);

    // Check status codes if provided
    if (
      allowedStatusCodes &&
      allowedStatusCodes.length > 0 &&
      !allowedStatusCodes.includes(response.status)
    ) {
      let errorMessage = `Unexpected status code: ${response.status} for ${
        options.method ?? 'GET'
      } ${url}`;
      try {
        const errorData = (await response.clone().json()) as {
          errors?: string[];
        };
        if (errorData?.errors && Array.isArray(errorData.errors)) {
          errorMessage = errorData.errors.join('\n');
        }
      } catch (e) {
        console.warn('Failed to parse error data:', e);
      }
      throw new Error(errorMessage);
    }

    // Parse the response as JSON
    const data = (await response.json()) as { errors?: string[] };

    // Fallback check if no allowedStatusCodes were provided
    if (
      !allowedStatusCodes &&
      !response.ok &&
      (!data.errors || !Array.isArray(data.errors))
    ) {
      throw new Error(
        `Irmin API fetch error: ${options.method ?? 'GET'} ${url}`
      );
    }

    // Throw an error if response contains errors
    if (data.errors && data.errors.length > 0) {
      const message = data.errors.join('\n');
      throw new Error(message);
    }

    return data as IrminAPIResponse;
  };

  /**
   * Fetch binary data from the Irmin API.
   *
   * @param url - The API endpoint URL.
   * @param options - Request options for the fetch call.
   * @param allowedStatusCodes - Optional list of allowed status codes.
   * @returns A promise that resolves with binary response data.
   */
  public fetchBinary = async (
    url: string,
    options: RequestInit,
    allowedStatusCodes?: number[]
  ): Promise<IrminAPIBinaryResponse> => {
    const headers = {
      ...options.headers,
      Accept: '*/*',
    };

    const response = await this._fetch(url, { ...options, headers });

    if (allowedStatusCodes && !allowedStatusCodes.includes(response.status)) {
      throw new Error(
        `Unexpected status code: ${response.status} for ${
          options.method ?? 'GET'
        } ${url}`
      );
    }

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      return await response.json();
    }

    if (contentType.startsWith('text/')) {
      return await response.text();
    }

    return await response.blob();
  };
}

export default IrminCore;
