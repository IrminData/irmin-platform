import IrminCore from '@/lib/core';

import { EditorItem, ScriptResult } from '@/types/core/EditorItems';
import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { ActionInputData } from '@/types/core/Workflow';

/**
 * Interface for creating an editor item
 */
interface CreateEditorItemRequest {
  type: string;
  content?: string;
}

/**
 * Interface for moving/copying editor items
 */
interface MoveEditorItemRequest {
  destination_path: string;
}

/**
 * Interface for executing editor items
 */
interface ExecuteEditorItemRequest {
  input?: ActionInputData[];
}

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
    this.runScript = this.runScript.bind(this);
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
    try {
      const endpoint = `/v1/workspaces/${workspace}/editor?path=${encodeURIComponent(
        path
      )}`;
      const response = await this.irminCore.fetchAPI(endpoint, {
        method: 'GET',
      });
      return response as IrminAPIResponse<EditorItem[]>;
    } catch (error) {
      console.error('Fetch editor items error', error);
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
    try {
      const endpoint = `/v1/workspaces/${workspace}/editor/content?path=${encodeURIComponent(
        path
      )}`;
      const response = await this.irminCore.fetchAPI(endpoint, {
        method: 'GET',
      });
      return response as IrminAPIResponse<string>;
    } catch (error) {
      console.error('Fetch editor item content error', error);
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
    try {
      const endpoint = `/v1/workspaces/${workspace}/editor/move?path=${encodeURIComponent(
        path
      )}`;
      const requestBody: MoveEditorItemRequest = {
        destination_path: destinationPath,
      };

      const response = await this.irminCore.fetchAPI(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      return response;
    } catch (error) {
      console.error('Move editor item error', error);
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
    try {
      const endpoint = `/v1/workspaces/${workspace}/editor/copy?path=${encodeURIComponent(
        path
      )}`;
      const requestBody: MoveEditorItemRequest = {
        destination_path: destinationPath,
      };

      const response = await this.irminCore.fetchAPI(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      return response;
    } catch (error) {
      console.error('Copy editor item error', error);
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
    try {
      const endpoint = `/v1/workspaces/${workspace}/editor?path=${encodeURIComponent(
        path
      )}`;
      const response = await this.irminCore.fetchAPI(endpoint, {
        method: 'DELETE',
      });
      return response;
    } catch (error) {
      console.error('Delete editor item error', error);
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
    try {
      const endpoint = `/v1/workspaces/${workspace}/editor?path=${encodeURIComponent(
        path
      )}`;
      const requestBody: CreateEditorItemRequest = {
        type: 'file',
        content,
      };

      const response = await this.irminCore.fetchAPI(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      return response;
    } catch (error) {
      console.error('Save editor item error', error);
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
    try {
      const endpoint = `/v1/workspaces/${workspace}/editor?path=${encodeURIComponent(
        path
      )}`;
      const requestBody: CreateEditorItemRequest = {
        type: 'folder',
      };

      const response = await this.irminCore.fetchAPI(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      return response;
    } catch (error) {
      console.error('Create editor folder error', error);
      throw error;
    }
  }

  /**
   * Execute a script.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.path - The path of the editor item.
   * @param props.inputs - The input data for the script.
   * @returns IrminAPIResponse containing an array of result rows.
   */
  async runScript({
    workspace,
    path,
    inputs = [],
  }: {
    workspace: string;
    path: string;
    inputs?: ActionInputData[];
  }): Promise<IrminAPIResponse<ScriptResult>> {
    try {
      const requestBody: ExecuteEditorItemRequest = {
        input: inputs,
      };

      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/editor/run?path=${path}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );
      return response as IrminAPIResponse<ScriptResult>;
    } catch (error) {
      console.error('Run script error', error);
      throw error;
    }
  }
}

export default EditorItemsService;
