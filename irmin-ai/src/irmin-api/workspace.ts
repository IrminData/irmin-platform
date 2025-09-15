import type IrminCore from '@/irmin-api';

import type { IrminAPIResponse } from '@/irmin-api/types/IrminAPIResponse';
import type { Workspace } from '@/irmin-api/types/workspace';

/**
 * Workspace API service
 *
 * Responsible for all workspace related API calls.
 */
class WorkspaceService {
  private irminCore: IrminCore;

  /**
   * Create a new WorkspaceService.
   *
   * @param irminCore - The IrminCore instance.
   */
  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.fetchWorkspaces = this.fetchWorkspaces.bind(this);
    this.fetchWorkspace = this.fetchWorkspace.bind(this);
  }

  /**
   * List all workspaces.
   *
   * @returns IrminAPIResponse containing an array of Workspace.
   */
  async fetchWorkspaces(): Promise<IrminAPIResponse<Workspace[]>> {
    try {
      const res = (await this.irminCore.fetchAPI(`/v1/workspaces`, {
        method: 'GET',
      })) as IrminAPIResponse<Workspace[]>;
      return res;
    } catch (error) {
      console.error((error as Error).message, 'Fetch workspaces error');
      throw error;
    }
  }

  /**
   * Fetch a single workspace by slug.
   *
   * @param props - The parameters.
   * @param props.workspaceSlug - The workspace slug.
   * @param props.timeoutMs - Timeout in milliseconds (default: 5 seconds for middleware).
   * @returns IrminAPIResponse containing the Workspace.
   */
  async fetchWorkspace({
    workspaceSlug,
    timeoutMs = 5000,
  }: {
    workspaceSlug: string;
    timeoutMs?: number;
  }): Promise<IrminAPIResponse<Workspace>> {
    try {
      const res = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspaceSlug}`,
        {
          method: 'GET',
        },
        undefined, // allowedStatusCodes
        timeoutMs
      )) as IrminAPIResponse<Workspace>;
      return res;
    } catch (error) {
      console.error('Fetch workspace error:', (error as Error).message);
      throw error;
    }
  }
}

export default WorkspaceService;
