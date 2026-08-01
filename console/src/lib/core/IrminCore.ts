import { clientEnv } from '@/config/env.client';

import type { Locale } from '@/lib/dict';
import { defaultLocale } from '@/lib/dict';

import removeCircularJSON from '@/utils/removeCircularJSON';

import type {
  IrminAPIBinaryResponse,
  IrminAPIResponse,
} from '@/types/core/IrminAPIResponse';

import { ContentTooLargeError, isContentTooLargePayload } from './errors';
import AIApplicationService from './resources/AIApplicationService';
import BillingService from './resources/BillingService';
import ConnectionOAuthService from './resources/ConnectionOAuthService';
import ConnectionService from './resources/ConnectionService';
import ConnectionSubscriptionService from './resources/ConnectionSubscriptionService';
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

  public apiBase = clientEnv.NEXT_PUBLIC_API_URL;
  public appBase = clientEnv.NEXT_PUBLIC_BASE_URL;

  public aiApplicationService: AIApplicationService;
  public billingService: BillingService;
  public scriptsService: ScriptsService;
  public connectionService: ConnectionService;
  public connectionSubscriptionService: ConnectionSubscriptionService;
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
  public connectionOAuthService: ConnectionOAuthService;

  /**
   * Updates the authentication token.
   * Used by IrminCoreContext to refresh tokens on cached instances.
   *
   * @param newToken - The new authentication token.
   */
  public setToken(newToken: string): void {
    this.token = newToken;
  }

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
    this.aiApplicationService = new AIApplicationService(this);
    this.billingService = new BillingService(this);
    this.scriptsService = new ScriptsService(this);
    this.connectionService = new ConnectionService(this);
    this.connectionSubscriptionService = new ConnectionSubscriptionService(
      this
    );
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
    this.connectionOAuthService = new ConnectionOAuthService(this);
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
          options.next?.revalidate ?? clientEnv.NEXT_PUBLIC_REVALIDATE,
        ...options.next,
      },
    };

    const requestURL = `${api_base}${url}`;

    // Fetch Core Irmin API
    const response = await fetch(requestURL, requestOptions);

    return response;
  };

  /**
   * Shared error-response handler for fetchAPI, fetchBinary, and
   * fetchRawBlob. Reads the response body (optionally cloning it),
   * extracts the best human-readable message, then throws — either
   * a rich `ContentTooLargeError` when the body matches the structured
   * 413 payload, or a plain `Error` otherwise.
   *
   * Never returns. Callers put this inside an `if (!ok)` branch and
   * rely on the throw to exit.
   *
   * Options exist because the three callers have small-but-meaningful
   * behavioral differences that predate this helper:
   *
   * - `gateOnContentType`: when true, only attempts `response.json()`
   *   if Content-Type includes `application/json`. Binary callers
   *   accept any content type and don't want to blindly parse a
   *   non-JSON body. `fetchAPI` always parses because its whole
   *   contract is JSON responses.
   * - `cloneResponse`: when true, parses a clone so the caller can
   *   still read the original body. `fetchAPI` needs this because
   *   its success path would otherwise fight for the stream. Binary
   *   callers throw on error and never reuse the body — leave false.
   * - `prefixStatusInMessage`: when true, the extracted message is
   *   wrapped as `[status] message` (binary-caller convention).
   *   `fetchAPI` uses the bare extracted message to stay
   *   backwards-compatible with callers that pattern-match on the
   *   error string.
   * - `warnOnParseError`: when true, a JSON parse failure logs a
   *   `console.warn`. `fetchAPI` warns; binary callers stay silent
   *   because missing JSON is expected for non-JSON responses.
   *
   * Previously each caller hand-rolled this block and the 413
   * structured-error handling was copy-pasted across all three —
   * fixing the payload shape in one site would silently leave the
   * others broken. Consolidating keeps that risk in one place.
   */
  private throwForResponse = async (
    response: Response,
    opts: {
      defaultMessage: string;
      gateOnContentType?: boolean;
      cloneResponse?: boolean;
      prefixStatusInMessage?: boolean;
      warnOnParseError?: boolean;
    }
  ): Promise<never> => {
    let message = opts.defaultMessage;
    let parsedBody: unknown = null;
    try {
      const shouldParse =
        !opts.gateOnContentType ||
        (response.headers.get('content-type') || '').includes(
          'application/json'
        );
      if (shouldParse) {
        const source = opts.cloneResponse ? response.clone() : response;
        parsedBody = await source.json();
        const body = parsedBody as {
          errors?: string[];
          message?: string;
        } | null;
        const uniqueMessages = new Set<string>();
        if (Array.isArray(body?.errors)) {
          body.errors.forEach((error: string) => {
            if (error) uniqueMessages.add(error);
          });
        }
        if (body?.message) {
          uniqueMessages.add(body.message);
        }
        if (uniqueMessages.size > 0) {
          const extracted = Array.from(uniqueMessages).join('\n');
          message = opts.prefixStatusInMessage
            ? `[${response.status}] ${extracted}`
            : extracted;
        }
      }
    } catch (e) {
      if (opts.warnOnParseError) {
        console.warn('Failed to parse error data:', e);
      }
    }
    // Rich-error path: the backend signals "content_too_large" on a
    // 413 via a structured payload that carries size + max. Throw a
    // typed error so viewer UIs can render a "download instead"
    // card instead of a generic error toast.
    if (response.status === 413) {
      const dataField = (parsedBody as { data?: unknown } | null)?.data;
      if (isContentTooLargePayload(dataField)) {
        throw new ContentTooLargeError(message, dataField);
      }
    }
    throw new Error(message);
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
      await this.throwForResponse(response, {
        defaultMessage: `Unexpected status code: ${response.status} for ${
          options.method ?? 'GET'
        } ${url}`,
        // fetchAPI's body is always JSON — don't gate.
        gateOnContentType: false,
        // Clone so the success path's `response.json()` downstream
        // doesn't race with the error parse.
        cloneResponse: true,
        // fetchAPI keeps backwards-compat by emitting a bare message.
        prefixStatusInMessage: false,
        // fetchAPI warns (historic behavior preserved).
        warnOnParseError: true,
      });
    }

    // Handle empty responses (e.g. 204 No Content)
    if (
      response.ok &&
      (response.status === 204 ||
        response.headers.get('content-length') === '0')
    ) {
      // Consume the body to release the underlying connection
      await response.body?.cancel();
      return { success: true, message: 'Success' } as IrminAPIResponse;
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
    const response = await this._fetch(url, {
      ...options,
      headers,
      cache: 'no-store',
    });

    // validate allowed statuses
    if (allowedStatusCodes && !allowedStatusCodes.includes(response.status)) {
      await this.throwForResponse(response, {
        defaultMessage: `Request failed with status ${response.status}`,
        // Binary responses may be non-JSON; only parse if the header
        // says so.
        gateOnContentType: true,
        // No clone needed — binary callers don't reuse the body.
        cloneResponse: false,
        // Binary-caller convention: prefix status in error message.
        prefixStatusInMessage: true,
      });
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

  /**
   * Fetch raw bytes from the Irmin API, always as a Blob regardless of
   * the response's Content-Type header. Use this for any path that is
   * ultimately a "download the file to disk" operation — notably
   * raw-object downloads where an `application/json` response is still
   * meant to be a file, not a parsed JS value.
   *
   * The motivating bug: `fetchBinary` auto-parses `application/json`
   * responses, so a 23 MB `stripe-customers.json` came back as a JS
   * array. The download path only knew how to turn Blob/string into a
   * browser download and fell through to the error alert — a silent
   * failure for the exact file type the download flow existed to
   * support.
   *
   * `fetchRawBlob` never parses. Blobs round-trip through
   * `URL.createObjectURL` + anchor click exactly the way the source
   * bytes arrived, so downloads are byte-identical to what the server
   * emitted.
   *
   * Error handling mirrors `fetchBinary` (including the typed
   * `ContentTooLargeError` throw path on structured 413s) so callers
   * swapping from `fetchBinary` don't lose any error fidelity.
   *
   * @param url – the API endpoint URL
   * @param options – fetch options
   * @param allowedStatusCodes – optional list of extra statuses to treat as OK
   * @returns the response as a raw Blob
   */
  public fetchRawBlob = async (
    url: string,
    options: RequestInit,
    allowedStatusCodes?: number[]
  ): Promise<Blob> => {
    const headers = {
      ...options.headers,
      Accept: '*/*',
    };

    const response = await this._fetch(url, {
      ...options,
      headers,
      cache: 'no-store',
    });

    if (allowedStatusCodes && !allowedStatusCodes.includes(response.status)) {
      await this.throwForResponse(response, {
        defaultMessage: `Request failed with status ${response.status}`,
        gateOnContentType: true,
        cloneResponse: false,
        prefixStatusInMessage: true,
      });
    }

    return await response.blob();
  };
}

export default IrminCore;
