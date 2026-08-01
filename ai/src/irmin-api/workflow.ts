import type IrminCore from '@/irmin-api';

import type { IrminAPIResponse } from '@/irmin-api/types/IrminAPIResponse';
import type { Workflow } from '@/irmin-api/types/Workflow';

/**
 * Workflow API service
 *
 * Responsible for all workflow related API calls.
 */
class WorkflowService {
  private irminCore: IrminCore;

  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    this.fetchWorkflow = this.fetchWorkflow.bind(this);
  }

  /**
   * Get a workflow by its ID.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.workflowID - The workflow identifier.
   * @returns IrminAPIResponse containing the Workflow.
   */
  async fetchWorkflow({
    workspace,
    workflowID,
  }: {
    workspace: string;
    workflowID: string;
  }): Promise<IrminAPIResponse<Workflow>> {
    try {
      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/workflows/${workflowID}`,
        { method: 'GET' }
      );
      return response as IrminAPIResponse<Workflow>;
    } catch (error) {
      console.error((error as Error).message, 'Get workflow error');
      throw error;
    }
  }
}

export default WorkflowService;
