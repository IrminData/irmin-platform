import type IrminCore from '@/lib/core';

import type {
  Connection,
  ConnectionFieldValues,
} from '@/types/core/Connection';
import type { ConnectorConfigurationValidationResult } from '@/types/core/Connector';
import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { ObjectSchema } from '@/types/core/ObjectSchema';
import type {
  SchemaDiff,
  SchemaValidationResult,
} from '@/types/core/SchemaValidation';

/**
 * Interface for creating a new connection
 */
interface CreateConnectionRequest {
  name: string;
  connector: string;
  description?: string;
  documentation?: string;
  details: ConnectionFieldValues;
  settings: ConnectionFieldValues;
  tags?: string[];
}

/**
 * Interface for updating a connection
 */
interface UpdateConnectionRequest {
  name?: string;
  description?: string;
  documentation?: string;
}

/**
 * Interface for updating connection configuration (details + settings only)
 */
interface UpdateConnectionConfigurationRequest {
  details: ConnectionFieldValues;
  settings: ConnectionFieldValues;
}

/**
 * Interface for transferring connection ownership
 */
interface TransferConnectionOwnershipRequest {
  new_owner_id: string;
}

/**
 * Connection API service
 *
 * Provides methods to interact with connection endpoints.
 */
class ConnectionService {
  private irminCore: IrminCore;

  /**
   * Create a new ConnectionService.
   *
   * @param irminCore - The IrminCore instance.
   */
  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.fetchConnections = this.fetchConnections.bind(this);
    this.fetchConnection = this.fetchConnection.bind(this);
    this.createConnection = this.createConnection.bind(this);
    this.updateConnection = this.updateConnection.bind(this);
    this.transferConnection = this.transferConnection.bind(this);
    this.deleteConnection = this.deleteConnection.bind(this);
    this.fetchConnectionSchema = this.fetchConnectionSchema.bind(this);
    this.testConnection = this.testConnection.bind(this);
    this.validateSchema = this.validateSchema.bind(this);
    this.diffSchema = this.diffSchema.bind(this);
  }

  /**
   * Fetch all connections for a workspace.
   *
   * - workspace: The workspace slug.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace to fetch connections from.
   * @returns IrminAPIResponse containing an array of Connection.
   */
  async fetchConnections({
    workspace,
  }: {
    workspace: string;
  }): Promise<IrminAPIResponse<Connection[]>> {
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/connections`,
        { method: 'GET' }
      )) as IrminAPIResponse<Connection[]>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch connections error');
      throw error;
    }
  }

  /**
   * Fetch a connection by ID.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace to fetch the connection from.
   * @param props.connectionID - The ID of the connection to fetch.
   * @returns IrminAPIResponse containing the Connection.
   */
  async fetchConnection({
    workspace,
    connectionID,
  }: {
    workspace: string;
    connectionID: string;
  }): Promise<IrminAPIResponse<Connection>> {
    try {
      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/connections/${connectionID}`,
        { method: 'GET' }
      );
      return response as IrminAPIResponse<Connection>;
    } catch (error) {
      console.error((error as Error).message, 'Fetch connection error');
      throw error;
    }
  }

  /**
   * Create a new connection.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.connectorID - The connector ID.
   * @param props.name - The connection name.
   * @param props.description - The connection description.
   * @param props.documentation - The connection documentation.
   * @param props.connectionDetails - The connection details.
   * @param props.connectionSettings - The connection settings.
   * @param props.tags - The connection tags.
   * @returns IrminAPIResponse containing the new Connection.
   */
  async createConnection({
    workspace,
    connectorID,
    name,
    description,
    documentation,
    connectionDetails,
    connectionSettings,
    tags,
  }: {
    workspace: string;
    connectorID: string;
    name: string;
    description: string;
    documentation: string;
    connectionDetails: ConnectionFieldValues;
    connectionSettings: ConnectionFieldValues;
    tags?: string[];
  }): Promise<IrminAPIResponse<Connection>> {
    try {
      const requestBody: CreateConnectionRequest = {
        name,
        connector: connectorID,
        description,
        documentation,
        details: connectionDetails,
        settings: connectionSettings,
        tags,
      };

      const res = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/connections`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      )) as IrminAPIResponse<Connection>;
      return res;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Failed to create new connection'
      );
      throw error;
    }
  }

  /**
   * Update an existing connection.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.connectionID - The connection's identifier.
   * @param props.name - The connection name.
   * @param props.description - The connection description.
   * @param props.documentation - The connection documentation.
   * @returns IrminAPIResponse containing the updated Connection.
   */
  async updateConnection({
    workspace,
    connectionID,
    name,
    description,
    documentation,
  }: {
    workspace: string;
    connectionID: string;
    name?: string;
    description?: string;
    documentation?: string;
  }): Promise<IrminAPIResponse<Connection>> {
    try {
      const requestBody: UpdateConnectionRequest = {};

      if (name !== undefined) requestBody.name = name;
      if (description !== undefined) requestBody.description = description;
      if (documentation !== undefined)
        requestBody.documentation = documentation;
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/connections/${connectionID}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      )) as IrminAPIResponse<Connection>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Update connection error');
      throw error;
    }
  }

  /**
   * Update the configuration (details/settings) of an existing connection.
   */
  async updateConnectionConfiguration({
    workspace,
    connectionID,
    details,
    settings,
  }: {
    workspace: string;
    connectionID: string;
    details: ConnectionFieldValues;
    settings: ConnectionFieldValues;
  }): Promise<IrminAPIResponse<Connection>> {
    try {
      const requestBody: UpdateConnectionConfigurationRequest = {
        details,
        settings,
      };

      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/connections/${connectionID}/configuration`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      )) as IrminAPIResponse<Connection>;
      return response;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Update connection configuration error'
      );
      throw error;
    }
  }

  /**
   * Transfer a connection to a new owner.
   *
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.connectionID - The connection's identifier.
   * @param props.newOwner - The new owner ID.
   * @returns IrminAPIResponse containing the updated Connection.
   */
  async transferConnection({
    workspace,
    connectionID,
    newOwner,
  }: {
    workspace: string;
    connectionID: string;
    newOwner: string;
  }): Promise<IrminAPIResponse<Connection>> {
    try {
      const requestBody: TransferConnectionOwnershipRequest = {
        new_owner_id: newOwner,
      };

      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/connections/${connectionID}/transfer-ownership`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      )) as IrminAPIResponse<Connection>;
      return response;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Transfer connection ownership error'
      );
      throw error;
    }
  }

  /**
   * Delete a connection.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.connectionID - The connection's identifier.
   * @returns IrminAPIResponse containing the result of deletion.
   */
  async deleteConnection({
    workspace,
    connectionID,
  }: {
    workspace: string;
    connectionID: string;
  }): Promise<IrminAPIResponse> {
    try {
      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/connections/${connectionID}`,
        { method: 'DELETE' }
      );
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Delete connection error');
      throw error;
    }
  }

  /**
   * Fetch the schema of a connection for a specific operation method.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.connectionID - The connection's identifier.
   * @param props.operationMethod - The operation method (e.g., 'pull', 'push').
   * @param props.path - The path within the connection to get schema for, empty string means the root path.
   * @returns IrminAPIResponse containing the schema.
   */
  async fetchConnectionSchema({
    workspace,
    connectionID,
    operationMethod,
    path,
  }: {
    workspace: string;
    connectionID: string;
    operationMethod: string;
    path?: string;
  }): Promise<IrminAPIResponse<ObjectSchema>> {
    try {
      const urlParams = new URLSearchParams();
      urlParams.append('operation_method', operationMethod);
      if (path) urlParams.append('path', path);
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/connections/${connectionID}/schema?${urlParams.toString()}`,
        { method: 'GET' }
      )) as IrminAPIResponse<ObjectSchema>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch connection schema error');
      throw error;
    }
  }

  /**
   * Test an existing connection using its stored credentials.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.connectionID - The connection's identifier.
   * @returns IrminAPIResponse containing the validation result.
   */
  async testConnection({
    workspace,
    connectionID,
  }: {
    workspace: string;
    connectionID: string;
  }): Promise<IrminAPIResponse<ConnectorConfigurationValidationResult>> {
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/connections/${connectionID}/test`,
        { method: 'POST' }
      )) as IrminAPIResponse<ConnectorConfigurationValidationResult>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Test connection error');
      throw error;
    }
  }

  /**
   * Validate data against a connection's schema.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.connectionID - The connection's identifier.
   * @param props.operationMethod - The operation method (e.g., 'pull', 'push').
   * @param props.files - The files to validate (matched by filename to schema children).
   * @param props.path - The path within the connection to validate against.
   * @returns IrminAPIResponse containing the validation result.
   */
  async validateSchema({
    workspace,
    connectionID,
    operationMethod,
    files,
    path,
  }: {
    workspace: string;
    connectionID: string;
    operationMethod: string;
    files: File[];
    path?: string;
  }): Promise<IrminAPIResponse<SchemaValidationResult>> {
    try {
      const urlParams = new URLSearchParams();
      urlParams.append('operation_method', operationMethod);
      if (path) urlParams.append('path', path);

      const formData = new FormData();
      for (const file of files) {
        formData.append('files', file);
      }

      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/connections/${connectionID}/schema/validate?${urlParams.toString()}`,
        {
          method: 'POST',
          body: formData,
        }
      )) as IrminAPIResponse<SchemaValidationResult>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Validate schema error');
      throw error;
    }
  }

  /**
   * Compare data schema against a connection's expected schema.
   * Note: Diff currently only supports a single file.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.connectionID - The connection's identifier.
   * @param props.operationMethod - The operation method (e.g., 'pull', 'push').
   * @param props.file - The file to compare schema for.
   * @param props.path - The path within the connection to compare against.
   * @returns IrminAPIResponse containing the schema diff.
   */
  async diffSchema({
    workspace,
    connectionID,
    operationMethod,
    file,
    path,
  }: {
    workspace: string;
    connectionID: string;
    operationMethod: string;
    file: File;
    path?: string;
  }): Promise<IrminAPIResponse<SchemaDiff>> {
    try {
      const urlParams = new URLSearchParams();
      urlParams.append('operation_method', operationMethod);
      if (path) urlParams.append('path', path);

      const formData = new FormData();
      formData.append('file', file);

      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/connections/${connectionID}/schema/diff?${urlParams.toString()}`,
        {
          method: 'POST',
          body: formData,
        }
      )) as IrminAPIResponse<SchemaDiff>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Diff schema error');
      throw error;
    }
  }
}

export default ConnectionService;
