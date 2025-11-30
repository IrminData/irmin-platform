import type IrminCore from '@/irmin-api';

import type { IrminAPIResponse } from '@/irmin-api/types/IrminAPIResponse';

class EditorItemService {
  private irminCore: IrminCore;

  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    this.getEditorItemContent = this.getEditorItemContent.bind(this);
  }

  /**
   * Get the content of an editor item (file).
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.path - The path of the editor item.
   * @returns IrminAPIResponse containing the file content as a string.
   */
  async getEditorItemContent({
    workspace,
    path,
  }: {
    workspace: string;
    path: string;
  }): Promise<IrminAPIResponse<string>> {
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/editor/content?path=${encodeURIComponent(path)}`,
        { method: 'GET' }
      )) as IrminAPIResponse<string>;
      return response;
    } catch (error) {
      console.error(
        (error as Error).message,
        `Fetch editor item content error: ${path}`
      );
      throw error;
    }
  }
}

export default EditorItemService;
