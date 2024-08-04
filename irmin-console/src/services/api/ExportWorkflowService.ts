import { Locale } from '@/dictionaries';
import IrminAPI from '@/services/IrminAPI';

import { IrminAPIResponse } from '@/types/api/IrminAPIResponse';

/**
 * Export Workflow API service
 *
 * Responsible for all Export Workflow related API calls.
 */
class ExportWorkflowService {
  private static instance: ExportWorkflowService;
  private api: IrminAPI = IrminAPI.getInstance();

  private constructor(locale: Locale, apiToken: string) {
    this.api.setProps(locale, apiToken);
  }

  /**
   * Get the instance of the {@link ExportWorkflowService}
   * @param locale - The locale to use for the instance
   * @param apiToken - The API token to use for the instance
   */
  public static getInstance(
    locale: Locale,
    apiToken: string
  ): ExportWorkflowService {
    if (!ExportWorkflowService.instance) {
      ExportWorkflowService.instance = new ExportWorkflowService(
        locale,
        apiToken
      );
    } else {
      // Update the existing instance
      ExportWorkflowService.instance.api.setProps(locale, apiToken);
    }
    return ExportWorkflowService.instance;
  }

  /**
   * Create a new export workflow
   *
   * @todo Provide link to Irmin API docs
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

      const res = await this.api.fetch(`/v1/exports/create`, {
        method: 'POST',
        body: formData,
      });
      return res;
    } catch (error) {
      console.error('Failed to create export workflow:', error);
      throw error;
    }
  }
}

export default ExportWorkflowService;
