import IrminCore from '@/lib/core';

import fake from '@/utils/prepareFakeResponse';

import { APIToken } from '@/types/core/APIToken';
import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { exampleAPITokens } from '@/types/examples/core';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment = process.env.NODE_ENV === 'development';

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
    if (isOfflineMode)
      return fake(exampleAPITokens) as IrminAPIResponse<APIToken[]>;
    try {
      const response = (await this.irminCore.fetchAPI(`/v1/credentials`, {
        method: 'GET',
      })) as IrminAPIResponse<APIToken[]>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Get system tokens error');
      if (isDevelopment)
        return fake(exampleAPITokens) as IrminAPIResponse<APIToken[]>;
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
  async createSystemToken({
    name,
    expiry,
  }: {
    name: string;
    expiry: number;
  }): Promise<IrminAPIResponse<APIToken>> {
    if (isOfflineMode)
      return fake({
        ...exampleAPITokens[0],
        name,
      }) as IrminAPIResponse<APIToken>;
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('expiry', expiry.toString());
      const response = (await this.irminCore.fetchAPI(`/v1/credentials`, {
        method: 'POST',
        body: formData,
      })) as IrminAPIResponse<APIToken>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Create system token error');
      if (isDevelopment)
        return fake({
          ...exampleAPITokens[0],
          name,
        }) as IrminAPIResponse<APIToken>;
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
    token,
  }: {
    token: string;
  }): Promise<IrminAPIResponse> {
    if (isOfflineMode) return fake();
    try {
      const response = await this.irminCore.fetchAPI(
        `/v1/credentials/${token}`,
        { method: 'DELETE' }
      );
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Revoke system token error');
      if (isDevelopment) return fake();
      throw error;
    }
  }
}

export default CredentialService;
