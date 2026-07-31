import type IrminCore from '@/lib/core';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { ScriptResult, StoredScript } from '@/types/core/Script';
import type { Template } from '@/types/core/Template';
import type { ActionInputData } from '@/types/core/Workflow';

/**
 * Interface for creating a script
 */
interface CreateScriptRequest {
  name: string;
  description?: string;
  content?: string;
  language?: string;
  tags?: string[];
}

/**
 * Interface for updating a script
 */
interface UpdateScriptRequest {
  name?: string;
  description?: string;
  content?: string;
  language?: string;
}

/**
 * Interface for executing a script
 */
interface ExecuteScriptRequest {
  input?: ActionInputData[];
}

/**
 * Interface for transferring script ownership
 */
interface TransferScriptOwnershipRequest {
  new_owner_id: string;
}

/**
 * Scripts service
 *
 * Provides methods to interact with the scripts API.
 */
class ScriptsService {
  private irminCore: IrminCore;

  /**
   * Create a new ScriptsService.
   */
  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.listScripts = this.listScripts.bind(this);
    this.getScript = this.getScript.bind(this);
    this.createScript = this.createScript.bind(this);
    this.updateScript = this.updateScript.bind(this);
    this.deleteScript = this.deleteScript.bind(this);
    this.transferScript = this.transferScript.bind(this);
    this.executeScript = this.executeScript.bind(this);
    this.listScriptTemplates = this.listScriptTemplates.bind(this);
  }

  /**
   * List all script templates available in a workspace.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @returns IrminAPIResponse containing an array of script templates.
   */
  async listScriptTemplates({
    workspace,
  }: {
    workspace: string;
  }): Promise<IrminAPIResponse<Template[]>> {
    try {
      const endpoint = `/v1/workspaces/${workspace}/scripts/templates`;
      const response = await this.irminCore.fetchAPI(endpoint, {
        method: 'GET',
      });
      return response as IrminAPIResponse<Template[]>;
    } catch (error) {
      console.error('List script templates error', error);
      throw error;
    }
  }

  /**
   * List all scripts in a workspace.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @returns IrminAPIResponse containing an array of StoredScript.
   */
  async listScripts({
    workspace,
  }: {
    workspace: string;
  }): Promise<IrminAPIResponse<StoredScript[]>> {
    try {
      const endpoint = `/v1/workspaces/${workspace}/scripts`;
      const response = await this.irminCore.fetchAPI(endpoint, {
        method: 'GET',
      });
      return response as IrminAPIResponse<StoredScript[]>;
    } catch (error) {
      console.error('List scripts error', error);
      throw error;
    }
  }

  /**
   * Get a specific script by ID.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.scriptId - The script ID.
   * @returns IrminAPIResponse containing a StoredScript.
   */
  async getScript({
    workspace,
    scriptId,
  }: {
    workspace: string;
    scriptId: string;
  }): Promise<IrminAPIResponse<StoredScript>> {
    try {
      const endpoint = `/v1/workspaces/${workspace}/scripts/${scriptId}`;
      const response = await this.irminCore.fetchAPI(endpoint, {
        method: 'GET',
      });
      return response as IrminAPIResponse<StoredScript>;
    } catch (error) {
      console.error('Get script error', error);
      throw error;
    }
  }

  /**
   * Create a new script.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.name - The script name.
   * @param props.description - The script description.
   * @param props.content - The script content.
   * @param props.language - The script language.
   * @param props.tags - The script tags.
   * @returns IrminAPIResponse containing the created StoredScript.
   */
  async createScript({
    workspace,
    name,
    description,
    content,
    language,
    tags,
  }: {
    workspace: string;
    name: string;
    description?: string;
    content?: string;
    language?: string;
    tags?: string[];
  }): Promise<IrminAPIResponse<StoredScript>> {
    try {
      const endpoint = `/v1/workspaces/${workspace}/scripts`;
      const requestBody: CreateScriptRequest = {
        name,
        description,
        content,
        language,
        tags,
      };

      const response = await this.irminCore.fetchAPI(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      return response as IrminAPIResponse<StoredScript>;
    } catch (error) {
      console.error('Create script error', error);
      throw error;
    }
  }

  /**
   * Update an existing script.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.scriptId - The script ID.
   * @param props.name - The updated script name.
   * @param props.description - The updated script description.
   * @param props.content - The updated script content.
   * @param props.language - The updated script language.
   * @returns IrminAPIResponse containing the updated StoredScript.
   */
  async updateScript({
    workspace,
    scriptId,
    name,
    description,
    content,
    language,
  }: {
    workspace: string;
    scriptId: string;
    name?: string;
    description?: string;
    content?: string;
    language?: string;
  }): Promise<IrminAPIResponse<StoredScript>> {
    try {
      const endpoint = `/v1/workspaces/${workspace}/scripts/${scriptId}`;
      const requestBody: UpdateScriptRequest = {
        name,
        description,
        content,
        language,
      };

      const response = await this.irminCore.fetchAPI(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      return response as IrminAPIResponse<StoredScript>;
    } catch (error) {
      console.error('Update script error', error);
      throw error;
    }
  }

  /**
   * Delete a script.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.scriptId - The script ID.
   * @returns IrminAPIResponse with the result of the deletion.
   */
  async deleteScript({
    workspace,
    scriptId,
  }: {
    workspace: string;
    scriptId: string;
  }): Promise<IrminAPIResponse> {
    try {
      const endpoint = `/v1/workspaces/${workspace}/scripts/${scriptId}`;
      const response = await this.irminCore.fetchAPI(endpoint, {
        method: 'DELETE',
      });
      return response;
    } catch (error) {
      console.error('Delete script error', error);
      throw error;
    }
  }

  /**
   * Transfer script ownership to another user.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.scriptId - The script ID.
   * @param props.newOwnerId - The new owner's user ID.
   * @returns IrminAPIResponse containing the updated StoredScript.
   */
  async transferScript({
    workspace,
    scriptId,
    newOwnerId,
  }: {
    workspace: string;
    scriptId: string;
    newOwnerId: string;
  }): Promise<IrminAPIResponse<StoredScript>> {
    try {
      const endpoint = `/v1/workspaces/${workspace}/scripts/${scriptId}/transfer-ownership`;
      const requestBody: TransferScriptOwnershipRequest = {
        new_owner_id: newOwnerId,
      };

      const response = await this.irminCore.fetchAPI(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      return response as IrminAPIResponse<StoredScript>;
    } catch (error) {
      console.error('Transfer script error', error);
      throw error;
    }
  }

  /**
   * Execute a script.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.scriptId - The script ID.
   * @param props.inputs - The input data for the script.
   * @returns IrminAPIResponse containing the script execution result.
   */
  async executeScript({
    workspace,
    scriptId,
    inputs = [],
    limitResponse,
  }: {
    workspace: string;
    scriptId: string;
    inputs?: ActionInputData[];
    limitResponse?: boolean;
  }): Promise<IrminAPIResponse<ScriptResult>> {
    try {
      const queryParams = limitResponse ? '?limit-response=true' : '';
      const endpoint = `/v1/workspaces/${workspace}/scripts/${scriptId}/execute${queryParams}`;
      const requestBody: ExecuteScriptRequest = {
        input: inputs,
      };

      const response = await this.irminCore.fetchAPI(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      return response as IrminAPIResponse<ScriptResult>;
    } catch (error) {
      console.error('Execute script error', error);
      throw error;
    }
  }
}

export default ScriptsService;
