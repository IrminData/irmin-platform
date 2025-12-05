import type IrminCore from '@/irmin-api';

import type { IrminAPIResponse } from '@/irmin-api/types/IrminAPIResponse';
import type { StoredScript } from '@/irmin-api/types/StoredScript';

class ScriptService {
  private irminCore: IrminCore;

  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    this.getScript = this.getScript.bind(this);
  }

  /**
   * Get a script by ID.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.scriptId - The ID of the script.
   * @returns IrminAPIResponse containing the script as a StoredScript.
   */
  async getScript({
    workspace,
    scriptId,
  }: {
    workspace: string;
    scriptId: string;
  }): Promise<IrminAPIResponse<StoredScript>> {
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/scripts/${scriptId}`,
        { method: 'GET' }
      )) as IrminAPIResponse<StoredScript>;
      return response;
    } catch (error) {
      console.error(
        (error as Error).message,
        `Fetch script error: ${scriptId}`
      );
      throw error;
    }
  }
}

export default ScriptService;
