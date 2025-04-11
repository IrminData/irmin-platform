import IrminCore from '@/lib/core';

import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { Role } from '@/types/core/IrminRole';

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
  async fetchRoles(): Promise<IrminAPIResponse<Role[]>> {
    try {
      const response = (await this.irminCore.fetchAPI(`/v1/roles`, {
        method: 'GET',
      })) as IrminAPIResponse<Role[]>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch roles error');
      throw error;
    }
  }
}

export default RoleService;
