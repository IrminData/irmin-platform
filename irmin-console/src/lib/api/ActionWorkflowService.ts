import { defaultLocale, Locale } from '@/dictionaries';

import { fetchWithCredentials } from '@/lib/fetchWithCredentials';
import { IrminAPIResponse } from '@/types/api/IrminAPIResponse';

const api_base = process.env.NEXT_PUBLIC_API_URL;

/**
 * Action Workflow API service
 *
 * Responsible for all Action Workflow related API calls.
 */
class ActionWorkflowService {
  private static instance: ActionWorkflowService;
  private locale: Locale = defaultLocale;

  private constructor(locale: Locale) {
    this.locale = locale;
  }

  /**
   * Get the instance of the {@link ActionWorkflowService}
   * @param locale - The locale to use for the instance
   */
  public static getInstance(locale: Locale): ActionWorkflowService {
    if (!ActionWorkflowService.instance) {
      ActionWorkflowService.instance = new ActionWorkflowService(locale);
    } else {
      // Update the locale if the instance already exists
      ActionWorkflowService.instance.setLocale(locale);
    }
    return ActionWorkflowService.instance;
  }

  /**
   * Set the locale for the instance
   * @param locale - The locale to set
   */
  public setLocale(locale: Locale) {
    this.locale = locale;
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

      const res = await fetchWithCredentials(
        `${api_base}/v1/actions/create`,
        {
          method: 'POST',
          body: formData,
        },
        this.locale
      );
      return res;
    } catch (error) {
      console.error('Failed to create action workflow:', error);
      throw error;
    }
  }
}

export default ActionWorkflowService;
