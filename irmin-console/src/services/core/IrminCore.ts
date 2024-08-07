import { defaultLocale, Locale } from '@/dictionaries';

import removeCircularJSON from '@/utils/removeCircularJSON';

import { IrminAPIResponse } from '@/types/api/IrminAPIResponse';

import ActionWorkflowService from './resources/ActionWorkflowService';
import AuthService from './resources/AuthService';
import BucketService from './resources/BucketService';
import ConnectionWorkflowService from './resources/ConnectionWorkflowService';
import ConnectorService from './resources/ConnectorService';
import DashboardService from './resources/DashboardService';
import ExportWorkflowService from './resources/ExportWorkflowService';
import InviteService from './resources/InviteService';
import ProfileService from './resources/ProfileService';
import RepositoryService from './resources/RepositoryService';
import RoleService from './resources/RoleService';
import UserService from './resources/UserService';
import WidgetService from './resources/WidgetService';
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

  public actionService: ActionWorkflowService;
  public authService: AuthService;
  public bucketService: BucketService;
  public connectionService: ConnectionWorkflowService;
  public connectorService: ConnectorService;
  public dashboardService: DashboardService;
  public repositoryService: RepositoryService;
  public exportService: ExportWorkflowService;
  public inviteService: InviteService;
  public profileService: ProfileService;
  public userService: UserService;
  public roleService: RoleService;
  public widgetService: WidgetService;
  public workflowService: WorkflowService;
  public workspaceService: WorkspaceService;

  constructor(locale: Locale, apiToken?: string) {
    // Set locale and token
    this.locale = locale || defaultLocale;
    this.token = apiToken || '';

    // Create a new instance of each service class
    // Pass the current IrminCore instance to each service class
    this.actionService = new ActionWorkflowService(this);
    this.authService = new AuthService(this);
    this.bucketService = new BucketService(this);
    this.connectionService = new ConnectionWorkflowService(this);
    this.connectorService = new ConnectorService(this);
    this.dashboardService = new DashboardService(this);
    this.repositoryService = new RepositoryService(this);
    this.exportService = new ExportWorkflowService(this);
    this.inviteService = new InviteService(this);
    this.profileService = new ProfileService(this);
    this.userService = new UserService(this);
    this.roleService = new RoleService(this);
    this.widgetService = new WidgetService(this);
    this.workflowService = new WorkflowService(this);
    this.workspaceService = new WorkspaceService(this);
  }

  public fetch = async (
    url: string,
    options: RequestInit
  ): Promise<IrminAPIResponse> => {
    const api_base = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.irmin.dev';
    const app_base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://irmin.dev';

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
        ...options.headers,
      },
    });
    const data = await response.json();

    // Handle errors
    if (!response.ok) {
      // Get the error message from the response
      const errorMessage = data.message || 'Request failed';
      throw new Error(errorMessage);
    }

    // Return the response as JSON
    const nonCircularData = removeCircularJSON(data);
    return nonCircularData as IrminAPIResponse;
  };
}

export default IrminCore;
