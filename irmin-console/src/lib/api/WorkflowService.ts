import { defaultLocale, Locale } from '@/dictionaries';
import {
  exampleAction,
  exampleAPIResponse,
  exampleConnection,
  exampleExport,
} from '@/lib/exampleObjects/apiObjects';
import { fetchWithCredentials } from '@/lib/fetchWithCredentials';

import { IrminAPIResponse } from '@/types/api/IrminAPIResponse';
import {
  ActionWorkflow,
  ConnectionWorkflow,
  ExportWorkflow,
} from '@/types/api/Workflow';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment =
  process.env.NEXT_PUBLIC_ENVIRONMENT_TYPE === 'development';
const api_base = process.env.NEXT_PUBLIC_API_URL;

/**
 * Connection Workflows API response type
 * @internal
 */
interface ConnectionsAPIResponse extends IrminAPIResponse {
  data: ConnectionWorkflow[];
}
/**
 * Export Workflows API response type
 * @internal
 */
interface ExportAPIResponse extends IrminAPIResponse {
  data: ExportWorkflow[];
}
/**
 * Action Workflows API response type
 * @internal
 */
interface ActionAPIResponse extends IrminAPIResponse {
  data: ActionWorkflow[];
}

/**
 * Workflow API service
 *
 * @remarks
 *
 * This service calls the Irmin API and is responsible for all workflow related API calls,
 * except for what is Workflow type specific. Those are handled by the specific services,
 * like ConnectionWorkflowService, ExportService, and ActionService.
 */
class WorkflowService {
  private static instance: WorkflowService;
  private locale: Locale = defaultLocale;

  private constructor(locale: Locale) {
    this.locale = locale;
  }

  /**
   * Get the instance of the {@link WorkflowService}
   * @param locale - The locale to use for the instance
   */
  public static getInstance(locale: Locale): WorkflowService {
    if (!WorkflowService.instance) {
      WorkflowService.instance = new WorkflowService(locale);
    } else {
      // Update the locale if the instance already exists
      WorkflowService.instance.setLocale(locale);
    }
    return WorkflowService.instance;
  }

  /**
   * Set the locale for the instance
   * @param locale - The locale to set
   */
  public setLocale(locale: Locale) {
    this.locale = locale;
  }

  // TODO: Add missing API calls
  // https://api.irmin.dev/docs#workflows-PATCHv1-workflows-update
  // https://api.irmin.dev/docs#workflows-PATCHv1-workflows-pause

  /**
   * Fetch all Connection Workflows
   * @returns response from the API or example data
   * {@link https://api.irmin.dev/docs#workflows-GETv1-connections | Irmin API docs}
   */
  async fetchConnections(): Promise<ConnectionsAPIResponse> {
    if (isOfflineMode)
      return { ...exampleAPIResponse, data: [exampleConnection] };
    try {
      const response = (await fetchWithCredentials(
        `${api_base}/v1/connections`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
        this.locale
      )) as ConnectionsAPIResponse;
      return response;
    } catch (error) {
      console.error('Fetch connections error:', error);
      if (isDevelopment)
        return { ...exampleAPIResponse, data: [exampleConnection] };
      throw error;
    }
  }

  /**
   * Fetch all Export Workflows
   * @todo Provide link to Irmin API docs
   * @returns response from the API or example data
   */
  async fetchExports(): Promise<ExportAPIResponse> {
    if (isOfflineMode) return { ...exampleAPIResponse, data: [exampleExport] };
    try {
      const response = (await fetchWithCredentials(
        `${api_base}/v1/exports`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
        this.locale
      )) as ExportAPIResponse;
      return response;
    } catch (error) {
      console.error('Fetch exports error:', error);
      if (isDevelopment)
        return { ...exampleAPIResponse, data: [exampleExport] };
      throw error;
    }
  }

  /**
   * Fetch all Action Workflows
   * @todo Provide link to Irmin API docs
   * @returns response from the API or example data
   */
  async fetchActions(): Promise<ActionAPIResponse> {
    if (isOfflineMode) return { ...exampleAPIResponse, data: [exampleAction] };
    try {
      const response = (await fetchWithCredentials(
        `${api_base}/v1/actions`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
        this.locale
      )) as ActionAPIResponse;
      return response;
    } catch (error) {
      console.error('Fetch actions error:', error);
      if (isDevelopment)
        return { ...exampleAPIResponse, data: [exampleAction] };
      throw error;
    }
  }
}

export default WorkflowService;
