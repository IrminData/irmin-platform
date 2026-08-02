import type IrminCore from '@/lib/core';

import type { ConnectionOAuthStatus } from '@/types/core/ConnectionOAuthStatus';
import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

/**
 * Response from `POST /workspaces/:w/connections/:c/oauth/start`.
 */
interface StartOAuthFlowResponse {
  authorization_url: string;
}

/**
 * Connection OAuth API service.
 *
 * Wraps the per-connection OAuth endpoints exposed by Core. The token
 * lifecycle (start, status, disconnect) is owned by Core; this service
 * is a thin TS wrapper used by the connection wizard and the status
 * card on the connection detail page.
 */
class ConnectionOAuthService {
  private irminCore: IrminCore;

  /**
   * Create a new ConnectionOAuthService.
   *
   * @param irminCore - The IrminCore instance.
   */
  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    this.startFlow = this.startFlow.bind(this);
    this.getStatus = this.getStatus.bind(this);
    this.disconnect = this.disconnect.bind(this);
  }

  /**
   * Start an OAuth authorization-code flow for a connection. Returns
   * the vendor authorization URL the console should open in a popup.
   *
   * @param props.workspace - Workspace slug.
   * @param props.connectionID - SQID of the connection.
   * @returns IrminAPIResponse containing the authorization URL.
   */
  async startFlow({
    workspace,
    connectionID,
  }: {
    workspace: string;
    connectionID: string;
  }): Promise<IrminAPIResponse<StartOAuthFlowResponse>> {
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/connections/${connectionID}/oauth/start`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      )) as IrminAPIResponse<StartOAuthFlowResponse>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Start OAuth flow error');
      throw error;
    }
  }

  /**
   * Read the OAuth token status for a connection.
   *
   * @param props.workspace - Workspace slug.
   * @param props.connectionID - SQID of the connection.
   * @returns IrminAPIResponse containing the ConnectionOAuthStatus snapshot.
   */
  async getStatus({
    workspace,
    connectionID,
  }: {
    workspace: string;
    connectionID: string;
  }): Promise<IrminAPIResponse<ConnectionOAuthStatus>> {
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/connections/${connectionID}/oauth/status`,
        {
          method: 'GET',
        }
      )) as IrminAPIResponse<ConnectionOAuthStatus>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Get OAuth status error');
      throw error;
    }
  }

  /**
   * Disconnect a connection's OAuth token. Best-effort vendor
   * revocation, then deletes the local token. The Connection row is
   * preserved so the user can reconnect without losing history.
   *
   * @param props.workspace - Workspace slug.
   * @param props.connectionID - SQID of the connection.
   * @returns IrminAPIResponse.
   */
  async disconnect({
    workspace,
    connectionID,
  }: {
    workspace: string;
    connectionID: string;
  }): Promise<IrminAPIResponse> {
    try {
      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/connections/${connectionID}/oauth/disconnect`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Disconnect OAuth error');
      throw error;
    }
  }
}

export default ConnectionOAuthService;
