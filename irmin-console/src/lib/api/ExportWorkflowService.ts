import { defaultLocale, Locale } from '@/dictionaries';

import { fetchWithCredentials } from '@/lib/fetchWithCredentials';
import { IrminAPIResponse } from '@/types/api/IrminAPIResponse';

const api_base = process.env.NEXT_PUBLIC_API_URL;

/**
 * Export Workflow API service
 *
 * @remarks
 *
 * This service calls the Irmin API and is responsible for all Export Workflow related API calls.
 */
class ExportWorkflowService {
  private static instance: ExportWorkflowService;
  private locale: Locale = defaultLocale;

  private constructor(locale: Locale) {
    this.locale = locale;
  }

  /**
   * Get the instance of the {@link ExportWorkflowService}
   * @param locale - The locale to use for the instance
   */
  public static getInstance(locale: Locale): ExportWorkflowService {
    if (!ExportWorkflowService.instance) {
      ExportWorkflowService.instance = new ExportWorkflowService(locale);
    } else {
      // Update the locale if the instance already exists
      ExportWorkflowService.instance.setLocale(locale);
    }
    return ExportWorkflowService.instance;
  }

  /**
   * Set the locale for the instance
   * @param locale - The locale to set
   */
  public setLocale(locale: Locale) {
    this.locale = locale;
  }

  /**
   * Create a new export workflow
   *
   * @param exportProps - Export workflow properties
   * @param exportProps.source - Data Set ID, where the data will be exported from
   * @param exportProps.destination - Connection Workflow ID, where the data will be exported
   * @param exportProps.name - Name of the workflow
   * @param exportProps.description - Description of the workflow
   * @param exportProps.cron_syntax - Cron syntax for the workflow, leave empty for manual run
   *
   * @returns required details fields to create a connection
   */
  public async createExportWorkflow({
    source,
    destination,
    name,
    description,
    cron_syntax,
  }: {
    source: number;
    destination: number;
    name: string;
    description: string;
    cron_syntax: string;
  }): Promise<IrminAPIResponse> {
    try {
      const formData = new FormData();

      // Export workflow properties
      formData.append('source', source.toString());
      formData.append('destination', destination.toString());

      // Workflow properties
      formData.append('name', name);
      formData.append('description', description);
      formData.append('cron_syntax', cron_syntax);

      const res = await fetchWithCredentials(
        `${api_base}/v1/exports/create`,
        {
          method: 'POST',
          body: formData,
        },
        this.locale
      );
      return res;
    } catch (error) {
      console.error('Failed to create export workflow:', error);
      throw error;
    }
  }
}

export default ExportWorkflowService;
