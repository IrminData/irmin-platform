import type IrminCore from '@/irmin-api';

import type { IrminAPIResponse } from '@/irmin-api/types/IrminAPIResponse';
import type { User } from '@/irmin-api/types/user';

/**
 * Profile API service
 *
 * Responsible for all user profile related API calls.
 */
class ProfileService {
  private irminCore: IrminCore;

  /**
   * Create a new ProfileService.
   *
   * @param irminCore - The IrminCore instance for API calls.
   */
  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.getProfile = this.getProfile.bind(this);
  }

  /**
   * Get the user's profile information.
   *
   * @param timeoutMs - Timeout in milliseconds (default: 5 seconds for middleware).
   * @returns IrminAPIResponse containing the user's profile.
   */
  async getProfile(timeoutMs: number = 5000): Promise<IrminAPIResponse<User>> {
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/profile`,
        {
          method: 'GET',
        },
        undefined, // allowedStatusCodes
        timeoutMs
      )) as IrminAPIResponse<User>;
      return response;
    } catch (error) {
      console.error('Get profile error:', (error as Error).message);
      throw error;
    }
  }
}

export default ProfileService;
