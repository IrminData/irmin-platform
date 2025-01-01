import { defaultLocale, Locale } from '@/lib/dict';

import removeCircularJSON from '@/utils/removeCircularJSON';

import {
  IrminAPIBinaryResponse,
  IrminAPIResponse,
} from '@/types/core/IrminAPIResponse';

import BranchService from './resources/BranchService';
import CommitService from './resources/CommitService';
import ConnectionService from './resources/ConnectionService';
import ConnectorService from './resources/ConnectorService';
import CredentialService from './resources/CredentialService';
import DiffService from './resources/DiffService';
import EditorItemsService from './resources/EditorItemsService';
import InviteService from './resources/InviteService';
import LogService from './resources/LogService';
import ObjectService from './resources/ObjectService';
import ProfileService from './resources/ProfileService';
import QueryService from './resources/QueryService';
import RepositoryService from './resources/RepositoryService';
import RoleService from './resources/RoleService';
import TagService from './resources/TagService';
import UserService from './resources/UserService';
import WorkflowService from './resources/WorkflowService';
import WorkspaceService from './resources/WorkspaceService';

const isDevelopment = process.env.NODE_ENV === 'development';

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

  public editorItemService: EditorItemsService;
  public connectionService: ConnectionService;
  public connectorService: ConnectorService;
  public repositoryService: RepositoryService;
  public branchService: BranchService;
  public commitService: CommitService;
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
  public objectService: ObjectService;
  public credentialService: CredentialService;

  constructor(locale: Locale, apiToken: string) {
    // Set locale and token
    this.locale = locale || defaultLocale;
    this.token = apiToken || '';

    // Create a new instance of each service class
    // Pass the current IrminCore instance to each service class
    this.editorItemService = new EditorItemsService(this);
    this.connectionService = new ConnectionService(this);
    this.connectorService = new ConnectorService(this);
    this.repositoryService = new RepositoryService(this);
    this.branchService = new BranchService(this);
    this.commitService = new CommitService(this);
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
    this.objectService = new ObjectService(this);
    this.credentialService = new CredentialService(this);
  }

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
    };

    const requestURL = `${api_base}${url}`;

    if (isDevelopment) {
      console.log('IrminCore fetch request');
      console.log('Fetch URL:', requestURL);
      console.log('Fetch Options:', requestOptions);
    }

    // Fetch Core Irmin API
    const response = await fetch(requestURL, requestOptions);

    if (isDevelopment) console.log('Fetch Response:', response);

    return response;
  };

  public fetchAPI = async (
    url: string,
    options: RequestInit
  ): Promise<IrminAPIResponse> => {
    // Call the Irmin API using the internal fetch method
    const response = await this._fetch(url, options);

    // Parse the response as JSON
    const data = await response.json();

    if (isDevelopment)
      console.log('Fetch Response data:', JSON.stringify(data, null, 2));

    // Check if the response is not OK and does not contain any error messages
    if (!response.ok && (!data.errors || !Array.isArray(data.errors))) {
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

  public fetchBinary = async (
    url: string,
    options: RequestInit
  ): Promise<IrminAPIBinaryResponse> => {
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
