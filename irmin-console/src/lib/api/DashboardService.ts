import { defaultLocale, Locale } from '@/dictionaries';
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

/**
 * Dashboard API response type
 * @internal
 */
interface DashboardAPIResponse extends IrminAPIResponse {
  data: Dashboard;
}

/**
 * Dashboards API response type
 * @internal
 */
interface DashboardsAPIResponse extends IrminAPIResponse {
  data: Dashboard[];
}

/**
 * Dashboard API service
 *
 * @remarks
 *
 * This service calls the Irmin API and is responsible for all dashboard related API calls.
 *
 * Like the other API services, this service is a singleton, meaning that only one
 * instance of the service can exist at a time.
 *
 * The service uses the {@link fetchWithCredentials} function to make API calls.
 *
 * If the environment is set to offline mode, service will return example data instead
 * of making API calls.
 *
 * If the environment is set to development, service will log the API call errors to
 * the console, but will not throw them. Instead, it will return the example data.
 *
 * Example data can be found here: `@/lib/exampleObjects/apiObjects`
 */
class DashboardService {
  private dashboards: Dashboard[] = [];

  private static instance: DashboardService;
  private locale: Locale = defaultLocale;

  private constructor(locale: Locale) {
    this.locale = locale;
  }

  /**
   * Get the instance of the {@link DashboardService}
   * @param locale - The locale to use for the instance
   */
  public static getInstance(locale: Locale): DashboardService {
    if (!DashboardService.instance) {
      DashboardService.instance = new DashboardService(locale);
    } else {
      // Update the locale if the instance already exists
      DashboardService.instance.setLocale(locale);
    }
    return DashboardService.instance;
  }

  /**
   * Set the locale for the instance
   * @param locale - The locale to set
   */
  public setLocale(locale: Locale) {
    this.locale = locale;
  }

  /**
   * Fetch all dashboards
   * TODO: Provide link to Irmin API docs
   * @returns response from the API or example data
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
   * @param dashboard - the dashboard to create
   * @returns response from the API or example data
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
   * @param dashboard - the dashboard to update
   * @returns response from the API or example data
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
   * @param dashboardId - the ID of the dashboard to delete
   * @returns response from the API or example data
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
   * @returns the stored dashboards array, which may be empty if not fetched yet
   */
  getDashboards(): Dashboard[] {
    return this.dashboards;
  }
}

export default DashboardService;
