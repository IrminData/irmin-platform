import IrminCore from '@/services/core/IrminCore';

/**
 * Export Workflow API service
 *
 * Responsible for all Export Workflow specific API calls.
 */
class ExportWorkflowService {
  private irminCore: IrminCore;

  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.createExportWorkflow = this.createExportWorkflow.bind(this);
  }

  /**
   * create new Export Workflow
   *
   * @todo Provide link to Irmin API docs
   *
   * @param exportProps - Export Workflow properties
   * @param exportProps.source - Repository ID, where the data will be exported from
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
  }) {
    try {
      const formData = new FormData();

      // Export Workflow properties
      formData.append('source', source.toString());
      formData.append('destination', destination.toString());

      // Workflow properties
      formData.append('name', name);
      formData.append('description', description);
      formData.append('cron_syntax', cron_syntax);

      const res = await this.irminCore.fetch(`/v1/exports/create`, {
        method: 'POST',
        body: formData,
      });
      return res;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Failed to create Export Workflow'
      );
      throw error;
    }
  }
}

export default ExportWorkflowService;
