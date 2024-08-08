import IrminCore from '@/services/core/IrminCore';

import fake from '@/utils/prepareFakeResponse';

import { IrminAPIResponse } from '@/types/api/IrminAPIResponse';
import { Widget } from '@/types/api/Widget';
import { exampleWidgets } from '@/types/examples/core';

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
  private irminCore: IrminCore;

  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.getWidgetById = this.getWidgetById.bind(this);
    this.createWidget = this.createWidget.bind(this);
    this.updateWidget = this.updateWidget.bind(this);
    this.deleteWidget = this.deleteWidget.bind(this);
  }

  /**
   * Fetch a widget by ID
   * @todo Provide link to Irmin API docs
   * @param widgetId - ID of the widget to fetch
   */
  async getWidgetById(widgetId: number): Promise<WidgetAPIResponse> {
    if (isOfflineMode) return fake(randomExampleWidget()) as WidgetAPIResponse;
    try {
      const response = (await this.irminCore.fetch(`/v1/widgets/${widgetId}`, {
        method: 'GET',
      })) as WidgetAPIResponse;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Get widget by ID error');
      if (isDevelopment)
        return fake(randomExampleWidget()) as WidgetAPIResponse;
      throw error;
    }
  }

  /**
   * Create a new widget
   * @todo Provide link to Irmin API docs
   * @param widget - the widget to create
   */
  async createWidget(widget: Widget) {
    if (isOfflineMode) return fake();
    try {
      const response = (await this.irminCore.fetch(`/v1/widgets`, {
        method: 'POST',

        body: JSON.stringify(widget),
      })) as IrminAPIResponse;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Create widget error');
      if (isDevelopment) return fake();
      throw error;
    }
  }

  /**
   * Update an existing widget
   * @todo Provide link to Irmin API docs
   * @param widget - the widget to update
   */
  async updateWidget(widget: Widget) {
    if (isOfflineMode) return fake();
    try {
      const body = new FormData();
      body.append('_method', 'PUT');
      body.append('widget', JSON.stringify(widget));

      const response = await this.irminCore.fetch(`/v1/widgets/${widget.id}`, {
        method: 'POST',
        body,
      });

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Update widget error');
      if (isDevelopment) return fake();
      throw error;
    }
  }

  /**
   * Delete a widget
   * @todo Provide link to Irmin API docs
   * @param widgetId - ID of the widget to delete
   */
  async deleteWidget(widgetId: number) {
    if (isOfflineMode) return fake();
    try {
      const body = new FormData();
      body.append('_method', 'DELETE');

      const response = await this.irminCore.fetch(`/v1/widgets/${widgetId}`, {
        method: 'POST',
        body,
      });
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Delete widget error');
      if (isDevelopment) return fake();
      throw error;
    }
  }
}

export default WidgetService;
