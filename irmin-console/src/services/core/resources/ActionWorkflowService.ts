import IrminCore from '@/services/core/IrminCore';

/**
 * Action Workflow API service
 *
 * Responsible for all Action Workflow specific API calls.
 */
class ActionWorkflowService {
  private irminCore: IrminCore;

  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.createActionWorkflow = this.createActionWorkflow.bind(this);
  }

  /**
   * Create a new Action Workflow
   *
   * @todo Provide link to Irmin API docs
   *
   * @param actionProps - Action Workflow properties
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
  }) {
    try {
      const formData = new FormData();

      // Action Workflow properties
      formData.append('source', path.toString());

      // Workflow properties
      formData.append('name', name);
      formData.append('description', description);
      formData.append('cron_syntax', cron_syntax);

      const res = await this.irminCore.fetch(`/v1/actions/create`, {
        method: 'POST',
        body: formData,
      });
      return res;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Failed to create Action Workflow'
      );
      throw error;
    }
  }
}

export default ActionWorkflowService;
