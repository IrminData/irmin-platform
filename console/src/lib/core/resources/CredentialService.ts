import type IrminCore from '@/lib/core';

import type { APIToken } from '@/types/core/APIToken';
import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

/**
 * Interface for creating API credentials
 */
export interface CreateCredentialRequest {
  name: string;
  expiry: number; // Seconds until expiry
}

/**
 * Credential API service
 *
 * Responsible for all system token related API calls.
 */
class CredentialService {
  private irminCore: IrminCore;

  /**
   * Create a new CredentialService.
   *
   * @param irminCore - The IrminCore instance.
   */
  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.getSystemTokens = this.getSystemTokens.bind(this);
    this.createSystemToken = this.createSystemToken.bind(this);
    this.revokeSystemToken = this.revokeSystemToken.bind(this);
  }

  /**
   * Get the user's system tokens.
   *
   * @returns IrminAPIResponse containing an array of APIToken.
   */
  async getSystemTokens(): Promise<IrminAPIResponse<APIToken[]>> {
    try {
      const response = (await this.irminCore.fetchAPI(`/v1/credentials`, {
        method: 'GET',
      })) as IrminAPIResponse<APIToken[]>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Get system tokens error');
      throw error;
    }
  }

  /**
   * Create a new system token.
   *
   * @param props - The parameters.
   * @param props.name - The token name.
   * @param props.expiry - The expiry time in seconds.
   * @returns IrminAPIResponse containing the created APIToken.
   */
  async createSystemToken(
    req: CreateCredentialRequest
  ): Promise<IrminAPIResponse<APIToken>> {
    try {
      const response = (await this.irminCore.fetchAPI(`/v1/credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      })) as IrminAPIResponse<APIToken>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Create system token error');
      throw error;
    }
  }

  /**
   * Revoke a system token.
   *
   * @param props - The parameters.
   * @param props.token - The token ID.
   * @returns IrminAPIResponse containing the result of the revocation.
   */
  async revokeSystemToken({
    tokenID,
  }: {
    tokenID: string;
  }): Promise<IrminAPIResponse> {
    try {
      const response = await this.irminCore.fetchAPI(
        `/v1/credentials/${tokenID}`,
        { method: 'DELETE' }
      );
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Revoke system token error');
      throw error;
    }
  }
}

export default CredentialService;
