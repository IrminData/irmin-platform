import { Locale } from '@/dictionaries';
import IrminAPI from '@/services/IrminAPI';

import { IrminAPIResponse } from '@/types/api/IrminAPIResponse';

/**
 * Action Workflow API service
 *
 * Responsible for all Action Workflow related API calls.
 */
class ActionWorkflowService {
  private static instance: ActionWorkflowService;
  private api: IrminAPI = IrminAPI.getInstance();

  private constructor(locale: Locale, apiToken: string) {
    this.api.setProps(locale, apiToken);
  }

  /**
   * Get the instance of the {@link ActionWorkflowService}
   * @param locale - The locale to use for the instance
   * @param apiToken - The API token to use for the instance
   */
  public static getInstance(
    locale: Locale,
    apiToken: string
  ): ActionWorkflowService {
    if (!ActionWorkflowService.instance) {
      ActionWorkflowService.instance = new ActionWorkflowService(
        locale,
        apiToken
      );
    } else {
      // Update the existing instance
      ActionWorkflowService.instance.api.setProps(locale, apiToken);
    }
    return ActionWorkflowService.instance;
  }

  /**
   * Create a new action workflow
   *
   * @todo Provide link to Irmin API docs
   *
   * @param actionProps - Action workflow properties
   * @param actionProps.path - Path to the action execution file
   * @param actionProps.name - Name of the workflow
   * @param actionProps.description - Description of the workflow
   * @param actionProps.cron_syntax - Cron syntax for the workflow, leave empty for manual run
   *
   * @returns required details fields to create a connection
   */
  public async createActionWorkflow({
    path,
    name,
    description,
    cron_syntax,
  }: {
    path: string;
    name: string;
    description: string;
    cron_syntax: string;
  }): Promise<IrminAPIResponse> {
    try {
      const formData = new FormData();

      // Action workflow properties
      formData.append('source', path.toString());

      // Workflow properties
      formData.append('name', name);
      formData.append('description', description);
      formData.append('cron_syntax', cron_syntax);

      const res = await this.api.fetch(`/v1/actions/create`, {
        method: 'POST',
        body: formData,
      });
      return res;
    } catch (error) {
      console.error('Failed to create action workflow:', error);
      throw error;
    }
  }
}

export default ActionWorkflowService;
