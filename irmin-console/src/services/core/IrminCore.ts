import { defaultLocale, Locale } from '@/dictionaries';

import { handleCoreAPIErrors } from '@/utils/errorParser';
import removeCircularJSON from '@/utils/removeCircularJSON';

import {
  IrminAPIResponse,
  IrminAPIUnstructuredResponse,
} from '@/types/core/IrminAPIResponse';

import BranchService from './resources/BranchService';
import BucketService from './resources/BucketService';
import CollectionService from './resources/CollectionService';
import CommitService from './resources/CommitService';
import ConnectionService from './resources/ConnectionService';
import ConnectorService from './resources/ConnectorService';
import DiffService from './resources/DiffService';
import InviteService from './resources/InviteService';
import LogService from './resources/LogService';
import ProfileService from './resources/ProfileService';
import QueryService from './resources/QueryService';
import RepositoryService from './resources/RepositoryService';
import RoleService from './resources/RoleService';
import SchemaService from './resources/SchemaService';
import TagService from './resources/TagService';
import UserService from './resources/UserService';
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

  public apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.irmin.dev';
  public appBase = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://irmin.dev';

  public bucketService: BucketService;
  public connectionService: ConnectionService;
  public connectorService: ConnectorService;
  public repositoryService: RepositoryService;
  public branchService: BranchService;
  public commitService: CommitService;
  public collectionService: CollectionService;
  public schemaService: SchemaService;
  public inviteService: InviteService;
  public profileService: ProfileService;
  public userService: UserService;
  public roleService: RoleService;
  public workflowService: WorkflowService;
  public workspaceService: WorkspaceService;
  public queryService: QueryService;
  public logService: LogService;
  public diffService: DiffService;
  public tagService: TagService;

  constructor(locale: Locale, apiToken: string) {
    // Set locale and token
    this.locale = locale || defaultLocale;
    this.token = apiToken || '';

    // Create a new instance of each service class
    // Pass the current IrminCore instance to each service class
    this.bucketService = new BucketService(this);
    this.connectionService = new ConnectionService(this);
    this.connectorService = new ConnectorService(this);
    this.repositoryService = new RepositoryService(this);
    this.branchService = new BranchService(this);
    this.commitService = new CommitService(this);
    this.collectionService = new CollectionService(this);
    this.schemaService = new SchemaService(this);
    this.inviteService = new InviteService(this);
    this.profileService = new ProfileService(this);
    this.userService = new UserService(this);
    this.roleService = new RoleService(this);
    this.workflowService = new WorkflowService(this);
    this.workspaceService = new WorkspaceService(this);
    this.queryService = new QueryService(this);
    this.logService = new LogService(this);
    this.diffService = new DiffService(this);
    this.tagService = new TagService(this);
  }

  private _fetch = async (
    url: string,
    options: RequestInit
  ): Promise<Response> => {
    const api_base = this.apiBase;
    const app_base = this.appBase;

    // Use the token if it is set
    if (this.token && this.token.length > 0) {
      options.headers = {
        Authorization: `Bearer ${this.token}`,
        ...options.headers,
      };
    }

    // Fetch Core Irmin API
    const response = await fetch(`${api_base}${url}`, {
      ...options,
      credentials: 'include', // Include credentials with every request
      headers: {
        Accept: 'application/json',
        'Accept-Language': this.locale, // Irmin API returns localised messages based on the Accept-Language header
        Referer: app_base,
        'Content-Type': 'multipart/form-data',
        ...options.headers,
      },
    });

    // Handle response errors
    if (!response.ok) {
      let errorMessage = `HTTP Error: ${response.status} ${response.statusText}`;

      // Check the Content-Type header to determine the type of response
      const contentType = response.headers.get('Content-Type');

      // Handle JSON error response
      if (contentType && contentType.includes('application/json')) {
        try {
          const errorData = await response.json();
          errorMessage =
            errorData.message || JSON.stringify(errorData) || errorMessage;
        } catch (jsonError) {
          console.warn('Failed to parse error response as JSON:', jsonError);
        }
      }
      // Handle text error response
      else if (contentType && contentType.includes('text')) {
        try {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        } catch (textError) {
          console.warn('Failed to parse error response as text:', textError);
        }
      }
      // Fallback for unknown content types or empty body
      else {
        errorMessage = await response.text().catch(() => errorMessage);
      }

      throw new Error(errorMessage);
    }

    return response;
  };

  public fetch = async (
    url: string,
    options: RequestInit
  ): Promise<IrminAPIResponse> => {
    // Call the Irmin API using the internal fetch method
    const response = await this._fetch(url, options);

    // Parse the response as JSON
    const data = await response.json();

    // Create the result object removing circular references
    const result = removeCircularJSON(data) as IrminAPIResponse;

    // Throw an error if response contains errors
    handleCoreAPIErrors(result);

    return result;
  };

  public fetchUnstructured = async (
    url: string,
    options: RequestInit
  ): Promise<IrminAPIUnstructuredResponse> => {
    // Call the Irmin API using the internal _fetch method
    const response = await this._fetch(url, options);

    // Check the Content-Type of the response to determine how to process it
    const contentType = response.headers.get('Content-Type');

    // Parse the response based on response data
    try {
      return await response.blob();
    } catch (error) {
      console.warn('Failed to parse response as Blob:', error);
    }
    try {
      return await response.json();
    } catch (error) {
      console.warn('Failed to parse response as text:', error);
    }
    try {
      const arrayBuffer = await response.arrayBuffer();
      // Convert the ArrayBuffer to Blob
      return new Blob([arrayBuffer], { type: contentType ?? '' });
    } catch (error) {
      console.warn('Failed to parse response as ArrayBuffer:', error);
    }
    // Parse and return the response as plain text if nothing else matches
    return await response.text();
  };
}

export default IrminCore;
