import IrminCore from '@/services/core/IrminCore';

import fake from '@/utils/prepareFakeResponse';

import { Dashboard } from '@/types/api/Dashboard';
import { IrminAPIResponse } from '@/types/api/IrminAPIResponse';
import { exampleDashboards } from '@/types/examples/base';

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

  private irminCore: IrminCore;

  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.fetchDashboards = this.fetchDashboards.bind(this);
    this.createDashboard = this.createDashboard.bind(this);
    this.updateDashboard = this.updateDashboard.bind(this);
    this.deleteDashboard = this.deleteDashboard.bind(this);
  }

  /**
   * Fetch all dashboards
   * @todo Provide link to Irmin API docs
   */
  async fetchDashboards(): Promise<DashboardsAPIResponse> {
    if (isOfflineMode) return fake(exampleDashboards) as DashboardsAPIResponse;
    try {
      const response = (await this.irminCore.fetch(`/v1/dashboards`, {
        method: 'GET',
      })) as DashboardsAPIResponse;
      this.dashboards = response.data;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch dashboards error');
      if (isDevelopment)
        return fake(exampleDashboards) as DashboardsAPIResponse;
      throw error;
    }
  }

  /**
   * Create a new dashboard
   * @todo Provide link to Irmin API docs
   * @param dashboard - the dashboard to create
   */
  async createDashboard(dashboard: Dashboard): Promise<DashboardAPIResponse> {
    if (isOfflineMode)
      return fake(exampleDashboards[0]) as DashboardAPIResponse;
    try {
      const response = (await this.irminCore.fetch(`/v1/dashboards`, {
        method: 'POST',

        body: JSON.stringify(dashboard),
      })) as DashboardAPIResponse;
      this.dashboards.push(response.data);
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Create dashboard error');
      if (isDevelopment)
        return fake(exampleDashboards[0]) as DashboardAPIResponse;
      throw error;
    }
  }

  /**
   * Update an existing dashboard
   * @todo Provide link to Irmin API docs
   * @param dashboard - the dashboard to update
   */
  async updateDashboard(dashboard: Dashboard): Promise<DashboardAPIResponse> {
    if (isOfflineMode)
      return fake(exampleDashboards[0]) as DashboardAPIResponse;
    try {
      const body = new FormData();
      body.append('_method', 'PUT');
      body.append('dashboard', JSON.stringify(dashboard));

      const response = (await this.irminCore.fetch(
        `/v1/dashboards/${dashboard.id}`,
        {
          method: 'POST',
          body,
        }
      )) as DashboardAPIResponse;

      const index = this.dashboards.findIndex((d) => d.id === dashboard.id);
      if (index !== undefined && index !== -1) {
        this.dashboards[index] = response.data;
      }
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Update dashboard error');
      if (isDevelopment)
        return fake(exampleDashboards[0]) as DashboardAPIResponse;
      throw error;
    }
  }

  /**
   * Delete a dashboard
   * @todo Provide link to Irmin API docs
   * @param dashboardId - the ID of the dashboard to delete
   */
  async deleteDashboard(dashboardId: number): Promise<void> {
    if (isOfflineMode) return;
    try {
      const body = new FormData();
      body.append('_method', 'DELETE');

      await this.irminCore.fetch(`/v1/dashboards/${dashboardId}`, {
        method: 'POST',
        body,
      });
      this.dashboards = this.dashboards.filter((d) => d.id !== dashboardId);
    } catch (error) {
      console.error((error as Error).message, 'Delete dashboard error');
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
