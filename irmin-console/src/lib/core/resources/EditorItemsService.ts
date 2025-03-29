import IrminCore from '@/lib/core';

import fake from '@/utils/prepareFakeResponse';

import { EditorItem } from '@/types/core/EditorItems';
import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { exampleEditorItems } from '@/types/examples/core';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * EditorItems service
 *
 * Provides methods to interact with the editor API.
 */
class EditorItemsService {
  private irminCore: IrminCore;

  /**
   * Create a new EditorItemsService.
   */
  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.listEditorItems = this.listEditorItems.bind(this);
    this.getEditorItemContent = this.getEditorItemContent.bind(this);
    this.moveEditorItem = this.moveEditorItem.bind(this);
    this.copyEditorItem = this.copyEditorItem.bind(this);
    this.deleteEditorItem = this.deleteEditorItem.bind(this);
    this.saveEditorItem = this.saveEditorItem.bind(this);
    this.createEditorFolder = this.createEditorFolder.bind(this);
  }

  /**
   * List editor items.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.path - The path of the editor item.
   * @returns IrminAPIResponse containing an array of EditorItem.
   */
  async listEditorItems({
    workspace,
    path,
  }: {
    workspace: string;
    path: string;
  }): Promise<IrminAPIResponse<EditorItem[]>> {
    if (isOfflineMode) {
      return fake(exampleEditorItems) as IrminAPIResponse<EditorItem[]>;
    }
    try {
      const endpoint = `/v1/workspaces/${workspace}/editor?path=${encodeURIComponent(
        path
      )}`;
      const response = await this.irminCore.fetchAPI(endpoint, {
        method: 'GET',
      });
      return response as IrminAPIResponse<EditorItem[]>;
    } catch (error: any) {
      console.error(error.message, 'Fetch editor items error');
      if (isDevelopment) {
        return fake(exampleEditorItems) as IrminAPIResponse<EditorItem[]>;
      }
      throw error;
    }
  }

  /**
   * Get editor item content.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.path - The path of the editor item.
   * @returns IrminAPIResponse containing a string with the editor item content.
   */
  async getEditorItemContent({
    workspace,
    path,
  }: {
    workspace: string;
    path: string;
  }): Promise<IrminAPIResponse<string>> {
    if (isOfflineMode) {
      return fake('Fake content') as IrminAPIResponse<string>;
    }
    try {
      const endpoint = `/v1/workspaces/${workspace}/editor/content?path=${encodeURIComponent(
        path
      )}`;
      const response = await this.irminCore.fetchAPI(endpoint, {
        method: 'GET',
      });
      return response as IrminAPIResponse<string>;
    } catch (error: any) {
      console.error(error.message, 'Fetch editor item content error');
      if (isDevelopment) {
        return fake('Fake content') as IrminAPIResponse<string>;
      }
      throw error;
    }
  }

  /**
   * Move an editor item.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.path - The current path of the editor item.
   * @param props.destinationPath - The destination path to move the item.
   * @returns IrminAPIResponse with the result of the move operation.
   */
  async moveEditorItem({
    workspace,
    path,
    destinationPath,
  }: {
    workspace: string;
    path: string;
    destinationPath: string;
  }): Promise<IrminAPIResponse> {
    if (isOfflineMode) {
      return fake(null) as IrminAPIResponse;
    }
    try {
      const endpoint = `/v1/workspaces/${workspace}/editor/move?path=${encodeURIComponent(
        path
      )}`;
      const body = new URLSearchParams();
      body.append('destination_path', destinationPath);
      const response = await this.irminCore.fetchAPI(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });
      return response;
    } catch (error: any) {
      console.error(error.message, 'Move editor item error');
      if (isDevelopment) {
        return fake(null) as IrminAPIResponse;
      }
      throw error;
    }
  }

  /**
   * Copy an editor item.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.path - The current path of the editor item.
   * @param props.destinationPath - The destination path to copy the item.
   * @returns IrminAPIResponse with the result of the copy operation.
   */
  async copyEditorItem({
    workspace,
    path,
    destinationPath,
  }: {
    workspace: string;
    path: string;
    destinationPath: string;
  }): Promise<IrminAPIResponse> {
    if (isOfflineMode) {
      return fake(null) as IrminAPIResponse;
    }
    try {
      const endpoint = `/v1/workspaces/${workspace}/editor/copy?path=${encodeURIComponent(
        path
      )}`;
      const body = new URLSearchParams();
      body.append('destination_path', destinationPath);
      const response = await this.irminCore.fetchAPI(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });
      return response;
    } catch (error: any) {
      console.error(error.message, 'Copy editor item error');
      if (isDevelopment) {
        return fake(null) as IrminAPIResponse;
      }
      throw error;
    }
  }

  /**
   * Delete an editor item.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.path - The path of the editor item.
   * @returns IrminAPIResponse with the result of the deletion.
   */
  async deleteEditorItem({
    workspace,
    path,
  }: {
    workspace: string;
    path: string;
  }): Promise<IrminAPIResponse> {
    if (isOfflineMode) {
      return fake(null) as IrminAPIResponse;
    }
    try {
      const endpoint = `/v1/workspaces/${workspace}/editor?path=${encodeURIComponent(
        path
      )}`;
      const response = await this.irminCore.fetchAPI(endpoint, {
        method: 'DELETE',
      });
      return response;
    } catch (error: any) {
      console.error(error.message, 'Delete editor item error');
      if (isDevelopment) {
        return fake(null) as IrminAPIResponse;
      }
      throw error;
    }
  }

  /**
   * Save an editor item.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.path - The path of the editor item.
   * @param props.content - The content to save.
   * @returns IrminAPIResponse with the result of the save operation.
   */
  async saveEditorItem({
    workspace,
    path,
    content,
  }: {
    workspace: string;
    path: string;
    content: string;
  }): Promise<IrminAPIResponse> {
    if (isOfflineMode) {
      return fake(null) as IrminAPIResponse;
    }
    try {
      const endpoint = `/v1/workspaces/${workspace}/editor?path=${encodeURIComponent(
        path
      )}`;
      const body = new URLSearchParams();
      body.append('type', 'file');
      body.append('content', content);
      const response = await this.irminCore.fetchAPI(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });
      return response;
    } catch (error: any) {
      console.error(error.message, 'Save editor item error');
      if (isDevelopment) {
        return fake(null) as IrminAPIResponse;
      }
      throw error;
    }
  }

  /**
   * Create an editor folder.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.path - The path where the folder is to be created.
   * @returns IrminAPIResponse with the result of the folder creation.
   */
  async createEditorFolder({
    workspace,
    path,
  }: {
    workspace: string;
    path: string;
  }): Promise<IrminAPIResponse> {
    if (isOfflineMode) {
      return fake(null) as IrminAPIResponse;
    }
    try {
      const endpoint = `/v1/workspaces/${workspace}/editor?path=${encodeURIComponent(
        path
      )}`;
      const body = new URLSearchParams();
      body.append('type', 'folder');
      const response = await this.irminCore.fetchAPI(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });
      return response;
    } catch (error: any) {
      console.error(error.message, 'Create editor folder error');
      if (isDevelopment) {
        return fake(null) as IrminAPIResponse;
      }
      throw error;
    }
  }
}

export default EditorItemsService;
