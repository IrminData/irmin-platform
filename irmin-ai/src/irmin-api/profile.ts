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
   * @returns IrminAPIResponse containing the user's profile.
   */
  async getProfile(): Promise<IrminAPIResponse<User>> {
    try {
      const response = (await this.irminCore.fetchAPI(`/v1/profile`, {
        method: 'GET',
      })) as IrminAPIResponse<User>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Get profile error');
      throw error;
    }
  }
}

export default ProfileService;
