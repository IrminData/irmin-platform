import IrminCore from '@/services/core/IrminCore';

import fake from '@/utils/prepareFakeResponse';

import { IrminAPIResponse } from '@/types/api/IrminAPIResponse';
import { Profile } from '@/types/api/Profile';
import { exampleProfile } from '@/types/examples/base';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment =
  process.env.NEXT_PUBLIC_ENVIRONMENT_TYPE === 'development';

/**
 * Profile API response type
 */
interface ProfileAPIResponse extends IrminAPIResponse {
  data: Profile;
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
    this.regenerateToken = this.regenerateToken.bind(this);
    this.updateProfile = this.updateProfile.bind(this);
  }

  /**
   * Get the user's profile information
   * {@link https://api.irmin.dev/docs#account-GETv1-account-profile | Irmin API docs}
   * @returns user's profile information or null if the user is not logged in
   */
  async getProfile(): Promise<ProfileAPIResponse | null> {
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

  /**
   * Regenerate the user's API token
   * {@link https://api.irmin.dev/docs#miscellaneous-POSTv1-regenerate-token | Irmin API docs}
   */
  async regenerateToken() {
    if (isOfflineMode) return fake();
    try {
      const response = await this.irminCore.fetch(`/v1/regenerate-token`, {
        method: 'POST',
      });
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Regenerate token error');
      if (isDevelopment) return fake();
      throw error;
    }
  }

  /**
   * Update the user's profile information
   * {@link https://api.irmin.dev/docs#account-PATCHv1-account-profile | Irmin API docs}
   * @param name - The user's name
   * @param company - The user's company
   * @param email - The user's email address
   */
  async updateProfile(name: string, company: string, email: string) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('company', company);
      formData.append('email', email);
      formData.append('_method', 'PATCH');

      const response = await this.irminCore.fetch(`/v1/account/profile`, {
        method: 'POST',
        body: formData,
      });
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Update profile error');
      if (isDevelopment) return fake();
      throw error;
    }
  }
}

export default ProfileService;
