import ConnectionService from '@/irmin-api/connection';
import ObjectService from '@/irmin-api/object';
import ProfileService from '@/irmin-api/profile';
import QueryService from '@/irmin-api/query';
import RepositoryService from '@/irmin-api/repository';
import ScriptService from '@/irmin-api/script';
import type {
  IrminAPIBinaryResponse,
  IrminAPIResponse,
} from '@/irmin-api/types/IrminAPIResponse';
import WorkflowService from '@/irmin-api/workflow';
import WorkspaceService from '@/irmin-api/workspace';

import { env } from '@/config/env';
import { TIMEOUTS } from '@/config/timeouts';

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
  public connectionService: ConnectionService;
  public workflowService: WorkflowService;
  public repositoryService: RepositoryService;
  public queryService: QueryService;
  public objectService: ObjectService;
  public scriptService: ScriptService;

  /**
   * Creates an instance of IrminCore.
   *
   * @param apiToken - The API token for authentication.
   */
  constructor(apiToken: string) {
    this.token = apiToken || '';

    this.profileService = new ProfileService(this);
    this.workspaceService = new WorkspaceService(this);
    this.connectionService = new ConnectionService(this);
    this.workflowService = new WorkflowService(this);
    this.repositoryService = new RepositoryService(this);
    this.queryService = new QueryService(this);
    this.objectService = new ObjectService(this);
    this.scriptService = new ScriptService(this);
  }

  /**
   * Internal fetch method to call the Irmin API.
   *
   * @param url - The API endpoint URL.
   * @param options - Request options for the fetch call.
   * @param timeoutMs - Timeout in milliseconds (default: 30 seconds).
   * @returns A promise that resolves with the response.
   */
  private _fetch = async (
    url: string,
    options: RequestInit,
    retries: number = 2,
    timeoutMs: number = TIMEOUTS.IRMIN_API_DEFAULT
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
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(requestURL, {
          ...requestOptions,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);

        const errorMessage =
          error instanceof Error ? error.message : 'Unknown fetch error';

        // Log the error for debugging
        console.error(
          `Irmin API request failed (attempt ${attempt + 1}/${retries}):`,
          {
            url: requestURL,
            error: errorMessage,
            isTimeout: error instanceof Error && error.name === 'AbortError',
          }
        );

        // If this is the last attempt, throw the error
        if (attempt === retries - 1) {
          const finalError =
            error instanceof Error && error.name === 'AbortError'
              ? `Irmin API request timeout after ${timeoutMs}ms: ${requestURL}`
              : `Irmin API request failed: ${errorMessage}`;
          throw new Error(finalError);
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
   * @param timeoutMs - Timeout in milliseconds (default: 30 seconds).
   * @returns A promise that resolves with the parsed API response.
   */
  public fetchAPI = async (
    url: string,
    options: RequestInit,
    allowedStatusCodes?: number[],
    timeoutMs?: number
  ): Promise<IrminAPIResponse> => {
    const response = await this._fetch(url, options, 2, timeoutMs);

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
   * @param timeoutMs - Timeout in milliseconds (default: 30 seconds).
   * @returns A promise that resolves with binary response data.
   */
  public fetchBinary = async (
    url: string,
    options: RequestInit,
    allowedStatusCodes?: number[],
    timeoutMs?: number
  ): Promise<IrminAPIBinaryResponse> => {
    const headers = {
      ...options.headers,
      Accept: '*/*',
    };

    const response = await this._fetch(
      url,
      { ...options, headers },
      2,
      timeoutMs
    );

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
