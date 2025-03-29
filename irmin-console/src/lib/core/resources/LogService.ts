import IrminCore from '@/lib/core';

import fake from '@/utils/prepareFakeResponse';

import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { LogEvent } from '@/types/core/Log';
import { exampleLogEvents } from '@/types/examples/core';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Log API service
 *
 * Responsible for all log related API calls.
 */
class LogService {
  private irminCore: IrminCore;

  /**
   * Create a new LogService.
   *
   * @param irminCore - The IrminCore instance for API calls.
   */
  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.fetchLogEvents = this.fetchLogEvents.bind(this);
  }

  /**
   * Fetch general audit log events for a workspace.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @returns IrminAPIResponse containing an array of LogEvent.
   */
  async fetchLogEvents({
    workspace,
  }: {
    workspace: string;
  }): Promise<IrminAPIResponse<LogEvent[]>> {
    if (isOfflineMode)
      return fake(exampleLogEvents) as IrminAPIResponse<LogEvent[]>;
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/logs`,
        { method: 'GET' }
      )) as IrminAPIResponse<LogEvent[]>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch Log Events error');
      if (isDevelopment)
        return fake(exampleLogEvents) as IrminAPIResponse<LogEvent[]>;
      throw error;
    }
  }
}

export default LogService;
