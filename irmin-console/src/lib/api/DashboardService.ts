import {
  exampleAPIResponse,
  exampleDashboard,
} from '@/lib/exampleObjects/apiObjects';
import { fetchWithCredentials } from '@/lib/fetchWithCredentials';

import { Dashboard } from '@/types/api/Dashboard';
import { IrminAPIResponse } from '@/types/api/IrminAPIResponse';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment =
  process.env.NEXT_PUBLIC_ENVIRONMENT_TYPE === 'development';

const api_base = process.env.NEXT_PUBLIC_API_URL;

interface DashboardAPIResponse extends IrminAPIResponse {
  data: Dashboard;
}

interface DashboardsAPIResponse extends IrminAPIResponse {
  data: Dashboard[];
}

class DashboardService {
  private dashboards: Dashboard[] = [];

  private static instance: DashboardService;
  private locale: string = 'en';

  private constructor(locale: string) {
    this.locale = locale;
  }

  public static getInstance(locale: string): DashboardService {
    if (!DashboardService.instance) {
      DashboardService.instance = new DashboardService(locale);
    } else {
      // Update the locale if the instance already exists
      DashboardService.instance.setLocale(locale);
    }
    return DashboardService.instance;
  }

  public setLocale(locale: string) {
    this.locale = locale;
  }

  /**
   * Fetch all dashboards
   * TODO: Provide link to Irmin API docs
   * @returns {Promise<DashboardsAPIResponse>}
   */
  async fetchDashboards(): Promise<DashboardsAPIResponse> {
    if (isOfflineMode)
      return { ...exampleAPIResponse, data: [exampleDashboard] };
    try {
      const response = (await fetchWithCredentials(
        `${api_base}/v1/dashboards`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
        this.locale
      )) as DashboardsAPIResponse;
      this.dashboards = response.data;
      return response;
    } catch (error) {
      console.error('Fetch dashboards error:', error);
      if (isDevelopment)
        return { ...exampleAPIResponse, data: [exampleDashboard] };
      throw error;
    }
  }

  /**
   * Create a new dashboard
   * TODO: Provide link to Irmin API docs
   * @param {Dashboard} dashboard
   * @returns {Promise<DashboardAPIResponse>}
   */
  async createDashboard(dashboard: Dashboard): Promise<DashboardAPIResponse> {
    if (isOfflineMode) return { ...exampleAPIResponse, data: exampleDashboard };
    try {
      const response = (await fetchWithCredentials(
        `${api_base}/v1/dashboards`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(dashboard),
        },
        this.locale
      )) as DashboardAPIResponse;
      this.dashboards.push(response.data);
      return response;
    } catch (error) {
      console.error('Create dashboard error:', error);
      if (isDevelopment)
        return { ...exampleAPIResponse, data: exampleDashboard };
      throw error;
    }
  }

  /**
   * Update an existing dashboard
   * TODO: Provide link to Irmin API docs
   * @param {Dashboard} dashboard
   * @returns {Promise<DashboardAPIResponse>}
   */
  async updateDashboard(dashboard: Dashboard): Promise<DashboardAPIResponse> {
    if (isOfflineMode) return { ...exampleAPIResponse, data: exampleDashboard };
    try {
      const body = new FormData();
      body.append('_method', 'PUT');
      body.append('dashboard', JSON.stringify(dashboard));

      const response = (await fetchWithCredentials(
        `${api_base}/v1/dashboards/${dashboard.id}`,
        {
          method: 'POST',
          body,
        },
        this.locale
      )) as DashboardAPIResponse;

      const index = this.dashboards.findIndex((d) => d.id === dashboard.id);
      if (index !== undefined && index !== -1) {
        this.dashboards[index] = response.data;
      }
      return response;
    } catch (error) {
      console.error('Update dashboard error:', error);
      if (isDevelopment)
        return { ...exampleAPIResponse, data: exampleDashboard };
      throw error;
    }
  }

  /**
   * Delete a dashboard
   * TODO: Provide link to Irmin API docs
   * @param {number} dashboardId
   * @returns {Promise<void>}
   */
  async deleteDashboard(dashboardId: number): Promise<void> {
    if (isOfflineMode) return;
    try {
      const body = new FormData();
      body.append('_method', 'DELETE');

      await fetchWithCredentials(
        `${api_base}/v1/dashboards/${dashboardId}`,
        {
          method: 'POST',
          body,
        },
        this.locale
      );
      this.dashboards = this.dashboards.filter((d) => d.id !== dashboardId);
    } catch (error) {
      console.error('Delete dashboard error:', error);
      if (isDevelopment) return;
      throw error;
    }
  }

  /**
   * Get all dashboards stored in the dashboards array
   * @returns {Dashboard[]}
   */
  getDashboards(): Dashboard[] {
    return this.dashboards;
  }
}

export default DashboardService;
