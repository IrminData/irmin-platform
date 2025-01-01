import IrminCore from '@/lib/core';

import fake from '@/utils/prepareFakeResponse';

import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { SystemToken } from '@/types/core/SystemToken';
import { exampleSystemTokens } from '@/types/examples/core';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Credential API service
 *
 * Responsible for all system token related API calls.
 */
class CredentialService {
  private irminCore: IrminCore;

  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.getSystemTokens = this.getSystemTokens.bind(this);
    this.createSystemToken = this.createSystemToken.bind(this);
  }

  /**
   * Get the user's system tokens
   */
  async getSystemTokens(): Promise<IrminAPIResponse<SystemToken[]>> {
    if (isOfflineMode)
      return fake(exampleSystemTokens) as IrminAPIResponse<SystemToken[]>;
    try {
      const response = (await this.irminCore.fetchAPI(`/v1/credentials`, {
        method: 'GET',
      })) as IrminAPIResponse<SystemToken[]>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Get system tokens error');
      // Ignore any other errors if in development mode
      if (isDevelopment)
        return fake(exampleSystemTokens) as IrminAPIResponse<SystemToken[]>;
      // Otherwise, throw the error
      throw error;
    }
  }

  /**
   * Create a new system token
   *
   * @param name - Name of the new system token
   * @param expiry - Time until expiration from the current date and time. In seconds.
   */
  async createSystemToken(
    name: string,
    expiry: number
  ): Promise<IrminAPIResponse<SystemToken>> {
    if (isOfflineMode)
      return fake({
        ...exampleSystemTokens[0],
        name,
      }) as IrminAPIResponse<SystemToken>;
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('expiry', expiry.toString());
      const response = (await this.irminCore.fetchAPI(`/v1/credentials`, {
        method: 'POST',
        body: formData,
      })) as IrminAPIResponse<SystemToken>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Create system token error');
      // Ignore any other errors if in development mode
      if (isDevelopment)
        return fake({
          ...exampleSystemTokens[0],
          name,
        }) as IrminAPIResponse<SystemToken>;
      // Otherwise, throw the error
      throw error;
    }
  }

  /**
   * Revoke a system token
   *
   * @param token - ID of the system token to revoke
   */
  async revokeSystemToken(token: string): Promise<IrminAPIResponse> {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();
      formData.append('_method', 'DELETE');
      const response = await this.irminCore.fetchAPI(
        `/v1/credentials/${token}`,
        {
          method: 'POST',
          body: formData,
        }
      );
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Revoke system token error');
      // Ignore any other errors if in development mode
      if (isDevelopment) return fake();
      // Otherwise, throw the error
      throw error;
    }
  }
}

export default CredentialService;
