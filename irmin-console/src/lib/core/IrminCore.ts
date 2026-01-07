import type { Locale } from '@/lib/dict';
import { defaultLocale } from '@/lib/dict';

import removeCircularJSON from '@/utils/removeCircularJSON';

import type {
  IrminAPIBinaryResponse,
  IrminAPIResponse,
} from '@/types/core/IrminAPIResponse';

import ConnectionService from './resources/ConnectionService';
import ConnectorService from './resources/ConnectorService';
import CredentialService from './resources/CredentialService';
import DiffService from './resources/DiffService';
import EmbeddingsService from './resources/EmbeddingsService';
import InviteService from './resources/InviteService';
import LogService from './resources/LogService';
import ObjectService from './resources/ObjectService';
import PolicyService from './resources/PolicyService';
import ProfileService from './resources/ProfileService';
import QueryService from './resources/QueryService';
import RepositoryBranchService from './resources/RepositoryBranchService';
import RepositoryCommitService from './resources/RepositoryCommitService';
import RepositoryService from './resources/RepositoryService';
import RepositoryTagService from './resources/RepositoryTagService';
import RoleService from './resources/RoleService';
import ScriptsService from './resources/ScriptsService';
import SearchService from './resources/SearchService';
import TagService from './resources/TagService';
import UserService from './resources/UserService';
import WorkflowRunService from './resources/WorkflowRunService';
import WorkflowService from './resources/WorkflowService';
import WorkspaceService from './resources/WorkspaceService';

/**
 * All Core API Services centralised in one place.
 *
 * This class is responsible for initialising all the services and
 * passing the current instance of IrminCore to each service.
 *
 * This class also handles the API token and locale.
 *
 * It provides a fetch method to make API calls to the Irmin Core API.
 */
class IrminCore {
  private locale: Locale;
  private token: string;

  public apiBase =
    process.env.NEXT_PUBLIC_API_URL ?? 'https://api.irmin.dev/api';
  public appBase = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://irmin.dev';

  public scriptsService: ScriptsService;
  public connectionService: ConnectionService;
  public connectorService: ConnectorService;
  public repositoryService: RepositoryService;
  public repositoryBranchService: RepositoryBranchService;
  public repositoryCommitService: RepositoryCommitService;
  public repositoryTagService: RepositoryTagService;
  public inviteService: InviteService;
  public profileService: ProfileService;
  public userService: UserService;
  public roleService: RoleService;
  public searchService: SearchService;
  public workflowService: WorkflowService;
  public workflowRunService: WorkflowRunService;
  public workspaceService: WorkspaceService;
  public queryService: QueryService;
  public logService: LogService;
  public diffService: DiffService;
  public objectService: ObjectService;
  public credentialService: CredentialService;
  public policyService: PolicyService;
  public tagService: TagService;
  public embeddingsService: EmbeddingsService;

  /**
   * Creates an instance of IrminCore.
   *
   * @param locale - The locale to use for API messages.
   * @param apiToken - The API token for authentication.
   */
  constructor(locale: Locale, apiToken: string) {
    // Set locale and token
    this.locale = locale || defaultLocale;
    this.token = apiToken || '';

    // Create a new instance of each service class
    // Pass the current IrminCore instance to each service class
    this.scriptsService = new ScriptsService(this);
    this.connectionService = new ConnectionService(this);
    this.connectorService = new ConnectorService(this);
    this.repositoryService = new RepositoryService(this);
    this.repositoryBranchService = new RepositoryBranchService(this);
    this.repositoryCommitService = new RepositoryCommitService(this);
    this.repositoryTagService = new RepositoryTagService(this);
    this.inviteService = new InviteService(this);
    this.profileService = new ProfileService(this);
    this.userService = new UserService(this);
    this.roleService = new RoleService(this);
    this.searchService = new SearchService(this);
    this.workflowService = new WorkflowService(this);
    this.workflowRunService = new WorkflowRunService(this);
    this.workspaceService = new WorkspaceService(this);
    this.queryService = new QueryService(this);
    this.logService = new LogService(this);
    this.diffService = new DiffService(this);
    this.objectService = new ObjectService(this);
    this.credentialService = new CredentialService(this);
    this.policyService = new PolicyService(this);
    this.tagService = new TagService(this);
    this.embeddingsService = new EmbeddingsService(this);
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
    options: RequestInit
  ): Promise<Response> => {
    const api_base = this.apiBase;
    const app_base = this.appBase;

    const requestOptions: RequestInit = {
      cache: options.cache ?? 'default', // Use default cache mode if not set
      credentials: 'include', // Include credentials with every request
      ...options,
      headers: {
        Accept: 'application/json',
        'Accept-Language': this.locale, // Irmin API returns localised messages based on the Accept-Language header
        Referer: app_base,
        Authorization: `Bearer ${this.token}`,
        ...options.headers,
      },
      next: {
        revalidate:
          options.next?.revalidate ??
          parseInt(process.env.NEXT_PUBLIC_REVALIDATE ?? '60'),
        ...options.next,
      },
    };

    const requestURL = `${api_base}${url}`;

    // Fetch Core Irmin API
    const response = await fetch(requestURL, requestOptions);

    return response;
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
    // Call the Irmin API using the internal fetch method
    const response = await this._fetch(url, options);

    // If allowedStatusCodes is provided, check the response status code
    if (
      allowedStatusCodes &&
      allowedStatusCodes.length > 0 &&
      !allowedStatusCodes.includes(response.status)
    ) {
      let errorMessage = `Unexpected status code: ${response.status} for ${
        options.method ?? 'GET'
      } ${url}`;
      try {
        // Clone response to safely parse JSON without consuming the original stream
        const errorData = await response.clone().json();
        const uniqueMessages = new Set<string>();

        if (errorData?.errors && Array.isArray(errorData.errors)) {
          errorData.errors.forEach((error: string) => {
            if (error) uniqueMessages.add(error);
          });
        }
        if (errorData?.message) {
          uniqueMessages.add(errorData.message);
        }

        if (uniqueMessages.size > 0) {
          errorMessage = Array.from(uniqueMessages).join('\n');
        }
      } catch (e) {
        // Ignore errors from parsing JSON
        console.warn('Failed to parse error data:', e);
      }
      throw new Error(errorMessage);
    }

    // Parse the response as JSON
    const data = await response.json();

    // Fallback check if no allowedStatusCodes were provided
    if (!allowedStatusCodes && !response.ok) {
      const uniqueMessages = new Set<string>();

      if (data.errors && Array.isArray(data.errors)) {
        data.errors.forEach((error: string) => {
          if (error) uniqueMessages.add(error);
        });
      }
      if (data.message) {
        uniqueMessages.add(data.message);
      }

      if (uniqueMessages.size > 0) {
        throw new Error(Array.from(uniqueMessages).join('\n'));
      }

      throw new Error(
        `Irmin API fetch error: ${options.method ?? 'GET'} ${url}`
      );
    }

    // Create the result object removing circular references
    const result = removeCircularJSON(data) as IrminAPIResponse;

    // Throw an error if response contains errors
    let message = '';
    if (result.errors && result.errors.length > 0) {
      message = result.errors.join('\n');
    }
    if (message.length > 0) {
      throw new Error(message);
    }

    return result;
  };

  /**
   * Fetch binary data from the Irmin API, throwing on any non‑OK status
   * unless explicitly allowed.
   *
   * @param url – the API endpoint URL
   * @param options – fetch options
   * @param allowedStatusCodes – optional list of extra statuses to treat as OK
   * @returns the response as a Blob, JSON, ArrayBuffer→Blob, or text
   */
  public fetchBinary = async (
    url: string,
    options: RequestInit,
    allowedStatusCodes?: number[]
  ): Promise<IrminAPIBinaryResponse> => {
    // ensure we accept anything
    const headers = {
      ...options.headers,
      Accept: '*/*',
    };

    // perform the request
    const response = await this._fetch(url, { ...options, headers });

    // validate allowed statuses
    if (allowedStatusCodes && !allowedStatusCodes.includes(response.status)) {
      throw new Error(
        `Unexpected status code: ${response.status} for ${
          options.method ?? 'GET'
        } ${url}`
      );
    }

    // inspect content type
    const contentType = response.headers.get('content-type') || '';

    // parse based on media type
    if (contentType.includes('application/json')) {
      return await response.json();
    }

    if (contentType.startsWith('text/')) {
      return await response.text();
    }

    // default to blob for binary data
    return await response.blob();
  };
}

export default IrminCore;
