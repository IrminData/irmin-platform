import { defaultLocale, Locale } from '@/dictionaries';
import {
  exampleAPIResponse,
  exampleWidgets,
} from '@/lib/exampleObjects/apiObjects';
import { fetchWithCredentials } from '@/lib/fetchWithCredentials';

import { IrminAPIResponse } from '@/types/api/IrminAPIResponse';
import { Widget } from '@/types/api/Widget';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment =
  process.env.NEXT_PUBLIC_ENVIRONMENT_TYPE === 'development';

const api_base = process.env.NEXT_PUBLIC_API_URL;

interface WidgetAPIResponse extends IrminAPIResponse {
  data: Widget;
}

const randomExampleWidget = () =>
  exampleWidgets[Math.floor(Math.random() * exampleWidgets.length)];

class WidgetService {
  private static instance: WidgetService;
  private locale: Locale = defaultLocale;

  private constructor(locale: Locale) {
    this.locale = locale;
  }

  public static getInstance(locale: Locale): WidgetService {
    if (!WidgetService.instance) {
      WidgetService.instance = new WidgetService(locale);
    } else {
      // Update the locale if the instance already exists
      WidgetService.instance.setLocale(locale);
    }
    return WidgetService.instance;
  }

  public setLocale(locale: Locale) {
    this.locale = locale;
  }

  /**
   * Fetch a widget by ID
   * TODO: Provide link to Irmin API docs
   * @param {number} widgetId
   * @returns {Promise<WidgetAPIResponse>}
   */
  async getWidgetById(widgetId: number): Promise<WidgetAPIResponse> {
    if (isOfflineMode)
      return { ...exampleAPIResponse, data: randomExampleWidget() };
    try {
      const response = (await fetchWithCredentials(
        `${api_base}/v1/widgets/${widgetId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
        this.locale
      )) as WidgetAPIResponse;
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
   * TODO: Provide link to Irmin API docs
   * @param {Widget} widget
   * @returns {Promise<IrminAPIResponse>}
   */
  async createWidget(widget: Widget): Promise<IrminAPIResponse> {
    if (isOfflineMode) return exampleAPIResponse;
    try {
      const response = (await fetchWithCredentials(
        `${api_base}/v1/widgets`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(widget),
        },
        this.locale
      )) as IrminAPIResponse;
      return response;
    } catch (error) {
      console.error('Create widget error:', error);
      if (isDevelopment) return exampleAPIResponse;
      throw error;
    }
  }

  /**
   * Update an existing widget
   * TODO: Provide link to Irmin API docs
   * @param {Widget} widget
   * @returns {Promise<IrminAPIResponse>}
   */
  async updateWidget(widget: Widget): Promise<IrminAPIResponse> {
    if (isOfflineMode) return exampleAPIResponse;
    try {
      const body = new FormData();
      body.append('_method', 'PUT');
      body.append('widget', JSON.stringify(widget));

      const response = await fetchWithCredentials(
        `${api_base}/v1/widgets/${widget.id}`,
        {
          method: 'POST',
          body,
        },
        this.locale
      );

      return response;
    } catch (error) {
      console.error('Update widget error:', error);
      if (isDevelopment) return exampleAPIResponse;
      throw error;
    }
  }

  /**
   * Delete a widget
   * TODO: Provide link to Irmin API docs
   * @param {number} widgetId
   * @returns {Promise<IrminAPIResponse>}
   */
  async deleteWidget(widgetId: number): Promise<IrminAPIResponse> {
    if (isOfflineMode) return exampleAPIResponse;
    try {
      const body = new FormData();
      body.append('_method', 'DELETE');

      const response = await fetchWithCredentials(
        `${api_base}/v1/widgets/${widgetId}`,
        {
          method: 'POST',
          body,
        },
        this.locale
      );
      return response;
    } catch (error) {
      console.error('Delete widget error:', error);
      if (isDevelopment) return exampleAPIResponse;
      throw error;
    }
  }
}

export default WidgetService;
