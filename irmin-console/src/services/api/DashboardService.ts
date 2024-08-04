import { Locale } from '@/dictionaries';
import IrminAPI from '@/services/IrminAPI';

import { Dashboard } from '@/types/api/Dashboard';
import { IrminAPIResponse } from '@/types/api/IrminAPIResponse';
import {
  exampleAPIResponse,
  exampleDashboards,
} from '@/types/examples/apiObjects';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment =
  process.env.NEXT_PUBLIC_ENVIRONMENT_TYPE === 'development';

/**
 * Dashboard API response type
 */
interface DashboardAPIResponse extends IrminAPIResponse {
  data: Dashboard;
}

/**
 * Dashboards API response type
 */
interface DashboardsAPIResponse extends IrminAPIResponse {
  data: Dashboard[];
}

/**
 * Dashboard API service
 *
 * Responsible for all dashboard related API calls.
 */
class DashboardService {
  private dashboards: Dashboard[] = [];

  private static instance: DashboardService;
  private api: IrminAPI = IrminAPI.getInstance();

  private constructor(locale: Locale, apiToken: string) {
    this.api.setProps(locale, apiToken);
  }

  /**
   * Get the instance of the {@link DashboardService}
   * @param locale - The locale to use for the instance
   * @param apiToken - The API token to use for the instance
   */
  public static getInstance(
    locale: Locale,
    apiToken: string
  ): DashboardService {
    if (!DashboardService.instance) {
      DashboardService.instance = new DashboardService(locale, apiToken);
    } else {
      // Update the existing instance
      DashboardService.instance.api.setProps(locale, apiToken);
    }
    return DashboardService.instance;
  }

  /**
   * Fetch all dashboards
   * @todo Provide link to Irmin API docs
   * @returns response from the API or example data
   */
  async fetchDashboards(): Promise<DashboardsAPIResponse> {
    if (isOfflineMode)
      return { ...exampleAPIResponse, data: exampleDashboards };
    try {
      const response = (await this.api.fetch(`/v1/dashboards`, {
        method: 'GET',
      })) as DashboardsAPIResponse;
      this.dashboards = response.data;
      return response;
    } catch (error) {
      console.error('Fetch dashboards error:', error);
      if (isDevelopment)
        return { ...exampleAPIResponse, data: exampleDashboards };
      throw error;
    }
  }

  /**
   * Create a new dashboard
   * @todo Provide link to Irmin API docs
   * @param dashboard - the dashboard to create
   * @returns response from the API or example data
   */
  async createDashboard(dashboard: Dashboard): Promise<DashboardAPIResponse> {
    if (isOfflineMode)
      return { ...exampleAPIResponse, data: exampleDashboards[0] };
    try {
      const response = (await this.api.fetch(`/v1/dashboards`, {
        method: 'POST',

        body: JSON.stringify(dashboard),
      })) as DashboardAPIResponse;
      this.dashboards.push(response.data);
      return response;
    } catch (error) {
      console.error('Create dashboard error:', error);
      if (isDevelopment)
        return { ...exampleAPIResponse, data: exampleDashboards[0] };
      throw error;
    }
  }

  /**
   * Update an existing dashboard
   * @todo Provide link to Irmin API docs
   * @param dashboard - the dashboard to update
   * @returns response from the API or example data
   */
  async updateDashboard(dashboard: Dashboard): Promise<DashboardAPIResponse> {
    if (isOfflineMode)
      return { ...exampleAPIResponse, data: exampleDashboards[0] };
    try {
      const body = new FormData();
      body.append('_method', 'PUT');
      body.append('dashboard', JSON.stringify(dashboard));

      const response = (await this.api.fetch(`/v1/dashboards/${dashboard.id}`, {
        method: 'POST',
        body,
      })) as DashboardAPIResponse;

      const index = this.dashboards.findIndex((d) => d.id === dashboard.id);
      if (index !== undefined && index !== -1) {
        this.dashboards[index] = response.data;
      }
      return response;
    } catch (error) {
      console.error('Update dashboard error:', error);
      if (isDevelopment)
        return { ...exampleAPIResponse, data: exampleDashboards[0] };
      throw error;
    }
  }

  /**
   * Delete a dashboard
   * @todo Provide link to Irmin API docs
   * @param dashboardId - the ID of the dashboard to delete
   * @returns response from the API or example data
   */
  async deleteDashboard(dashboardId: number): Promise<void> {
    if (isOfflineMode) return;
    try {
      const body = new FormData();
      body.append('_method', 'DELETE');

      await this.api.fetch(`/v1/dashboards/${dashboardId}`, {
        method: 'POST',
        body,
      });
      this.dashboards = this.dashboards.filter((d) => d.id !== dashboardId);
    } catch (error) {
      console.error('Delete dashboard error:', error);
      if (isDevelopment) return;
      throw error;
    }
  }

  /**
   * Get all dashboards stored in the dashboards array
   * @returns the stored dashboards array, which may be empty if not fetched yet
   */
  getDashboards(): Dashboard[] {
    return this.dashboards;
  }
}

export default DashboardService;
