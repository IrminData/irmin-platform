import IrminCore from '@/services/core/IrminCore';

import fake from '@/utils/prepareFakeResponse';

import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { User } from '@/types/core/User';
import { exampleProfile } from '@/types/examples/core';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment =
  process.env.NEXT_PUBLIC_ENVIRONMENT_TYPE === 'development';

/**
 * Profile API response type
 */
interface ProfileAPIResponse extends IrminAPIResponse {
  data: User;
}

/**
 * Profile API service
 *
 * Responsible for all user profile related API calls.
 */
class ProfileService {
  private irminCore: IrminCore;

  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.getProfile = this.getProfile.bind(this);
  }

  /**
   * Get the user's profile information
   * @returns user's profile information or null if the user is not logged in
   */
  async getProfile(): Promise<ProfileAPIResponse | null> {
    if (isOfflineMode) return fake(exampleProfile) as ProfileAPIResponse;
    try {
      const response = (await this.irminCore.fetch(`/v1/account/profile`, {
        method: 'GET',
      })) as ProfileAPIResponse;
      return response;
    } catch (error) {
      // Check if the error is due to not being logged in
      if ((error as { message: string }).message === 'Unauthenticated.') {
        // If the user isn't logged in, log a message and return null
        console.log("User isn't logged in");
        return null;
      }
      // Otherwise, log the error
      console.error((error as Error).message, 'Get profile error');
      // Ignore any other errors if in development mode
      if (isDevelopment) return fake(exampleProfile) as ProfileAPIResponse;
      // Otherwise, throw the error
      throw error;
    }
  }
}

export default ProfileService;
