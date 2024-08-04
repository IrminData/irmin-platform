import { Locale } from '@/dictionaries';
import IrminAPI from '@/services/IrminAPI';

import { IrminAPIResponse } from '@/types/api/IrminAPIResponse';
import { Widget } from '@/types/api/Widget';
import {
  exampleAPIResponse,
  exampleWidgets,
} from '@/types/examples/apiObjects';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment =
  process.env.NEXT_PUBLIC_ENVIRONMENT_TYPE === 'development';

/**
 * Widget API response type
 */
interface WidgetAPIResponse extends IrminAPIResponse {
  data: Widget;
}

/**
 * Get a random example widget
 * @returns a random example widget
 */
const randomExampleWidget = () =>
  exampleWidgets[Math.floor(Math.random() * exampleWidgets.length)];

/**
 * Dashboard Widget API service
 *
 * Responsible for all dashboard widget related API calls.
 */
class WidgetService {
  private static instance: WidgetService;
  private api: IrminAPI = IrminAPI.getInstance();

  private constructor(locale: Locale, apiToken: string) {
    this.api.setProps(locale, apiToken);
  }

  /**
   * Get the instance of the {@link WidgetService}
   * @param locale - The locale to use for the instance
   * @param apiToken - The API token to use for the instance
   */
  public static getInstance(locale: Locale, apiToken: string): WidgetService {
    if (!WidgetService.instance) {
      WidgetService.instance = new WidgetService(locale, apiToken);
    } else {
      // Update the locale if the instance already exists
      WidgetService.instance.api.setProps(locale, apiToken);
    }
    return WidgetService.instance;
  }

  /**
   * Fetch a widget by ID
   * @todo Provide link to Irmin API docs
   * @param widgetId - ID of the widget to fetch
   * @returns response from the API or example data
   */
  async getWidgetById(widgetId: number): Promise<WidgetAPIResponse> {
    if (isOfflineMode)
      return { ...exampleAPIResponse, data: randomExampleWidget() };
    try {
      const response = (await this.api.fetch(`/v1/widgets/${widgetId}`, {
        method: 'GET',
      })) as WidgetAPIResponse;
      return response;
    } catch (error) {
      console.error('Get widget by ID error:', error);
      if (isDevelopment)
        return { ...exampleAPIResponse, data: randomExampleWidget() };
      throw error;
    }
  }

  /**
   * Create a new widget
   * @todo Provide link to Irmin API docs
   * @param widget - the widget to create
   * @returns response from the API or example data
   */
  async createWidget(widget: Widget): Promise<IrminAPIResponse> {
    if (isOfflineMode) return exampleAPIResponse;
    try {
      const response = (await this.api.fetch(`/v1/widgets`, {
        method: 'POST',

        body: JSON.stringify(widget),
      })) as IrminAPIResponse;
      return response;
    } catch (error) {
      console.error('Create widget error:', error);
      if (isDevelopment) return exampleAPIResponse;
      throw error;
    }
  }

  /**
   * Update an existing widget
   * @todo Provide link to Irmin API docs
   * @param widget - the widget to update
   * @returns response from the API or example data
   */
  async updateWidget(widget: Widget): Promise<IrminAPIResponse> {
    if (isOfflineMode) return exampleAPIResponse;
    try {
      const body = new FormData();
      body.append('_method', 'PUT');
      body.append('widget', JSON.stringify(widget));

      const response = await this.api.fetch(`/v1/widgets/${widget.id}`, {
        method: 'POST',
        body,
      });

      return response;
    } catch (error) {
      console.error('Update widget error:', error);
      if (isDevelopment) return exampleAPIResponse;
      throw error;
    }
  }

  /**
   * Delete a widget
   * @todo Provide link to Irmin API docs
   * @param widgetId - ID of the widget to delete
   * @returns response from the API or example data
   */
  async deleteWidget(widgetId: number): Promise<IrminAPIResponse> {
    if (isOfflineMode) return exampleAPIResponse;
    try {
      const body = new FormData();
      body.append('_method', 'DELETE');

      const response = await this.api.fetch(`/v1/widgets/${widgetId}`, {
        method: 'POST',
        body,
      });
      return response;
    } catch (error) {
      console.error('Delete widget error:', error);
      if (isDevelopment) return exampleAPIResponse;
      throw error;
    }
  }
}

export default WidgetService;
