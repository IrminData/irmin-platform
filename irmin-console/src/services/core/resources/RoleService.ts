import IrminCore from '@/services/core/IrminCore';

import fake from '@/utils/prepareFakeResponse';

import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { IrminRole } from '@/types/core/IrminRole';
import { exampleRoles } from '@/types/examples/core';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Roles API response type
 */
export interface RolesAPIResponse extends IrminAPIResponse {
  data: IrminRole[];
}

/**
 * Irmin Role API service
 *
 * Responsible for Role related API calls.
 */
class RoleService {
  private irminCore: IrminCore;

  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.fetchRoles = this.fetchRoles.bind(this);
  }

  /**
   * Fetch all available roles
   */
  async fetchRoles(): Promise<RolesAPIResponse> {
    if (isOfflineMode) return fake(exampleRoles) as RolesAPIResponse;
    try {
      const response = (await this.irminCore.fetch(`/v1/roles`, {
        method: 'GET',
      })) as RolesAPIResponse;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch roles error');
      if (isDevelopment) return fake(exampleRoles) as RolesAPIResponse;
      throw error;
    }
  }
}

export default RoleService;
