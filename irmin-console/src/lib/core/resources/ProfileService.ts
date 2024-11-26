import IrminCore from '@/lib/core';

import fake from '@/utils/prepareFakeResponse';

import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { User } from '@/types/core/User';
import { exampleProfile } from '@/types/examples/core';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment = process.env.NODE_ENV === 'development';

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
    this.updateProfile = this.updateProfile.bind(this);
  }

  /**
   * Get the user's profile information
   */
  async getProfile(): Promise<IrminAPIResponse<User>> {
    if (isOfflineMode) return fake(exampleProfile) as IrminAPIResponse<User>;
    try {
      const response = (await this.irminCore.fetchAPI(`/v1/profile`, {
        method: 'GET',
      })) as IrminAPIResponse<User>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Get profile error');
      // Ignore any other errors if in development mode
      if (isDevelopment) return fake(exampleProfile) as IrminAPIResponse<User>;
      // Otherwise, throw the error
      throw error;
    }
  }

  /**
   * Update the user's profile information
   *
   * @param first_name - (optional) User's new first name
   * @param last_name - (optional) User's new last name
   * @param email - (optional) User's new email
   * @param phone - (optional) User's new phone number
   * @param company - (optional) User's new company name
   * @param profile_picture - (optional) User's new profile picture
   */
  async updateProfile(
    first_name?: string,
    last_name?: string,
    email?: string,
    phone?: string,
    company?: string,
    profile_picture?: File
  ): Promise<IrminAPIResponse<User>> {
    if (isOfflineMode) return fake(exampleProfile) as IrminAPIResponse<User>;
    const formData = new FormData();
    formData.append('_method', 'PATCH');
    if (first_name) formData.append('first_name', first_name);
    if (last_name) formData.append('last_name', last_name);
    if (email) formData.append('email', email);
    if (phone) formData.append('phone', phone);
    if (company) formData.append('company', company);
    if (profile_picture) formData.append('avatar', profile_picture);
    try {
      const response = (await this.irminCore.fetchAPI(`/v1/profile`, {
        method: 'POST',
        body: formData,
      })) as IrminAPIResponse<User>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Update profile error');
      // Ignore any other errors if in development mode
      if (isDevelopment) return fake(exampleProfile) as IrminAPIResponse<User>;
      // Otherwise, throw the error
      throw error;
    }
  }
}

export default ProfileService;
