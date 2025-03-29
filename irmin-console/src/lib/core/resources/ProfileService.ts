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

  /**
   * Create a new ProfileService.
   *
   * @param irminCore - The IrminCore instance for API calls.
   */
  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.getProfile = this.getProfile.bind(this);
    this.updateProfile = this.updateProfile.bind(this);
  }

  /**
   * Get the user's profile information.
   *
   * @returns IrminAPIResponse containing the user's profile.
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
      if (isDevelopment) return fake(exampleProfile) as IrminAPIResponse<User>;
      throw error;
    }
  }

  /**
   * Update the user's profile information.
   *
   * @param props - The profile update properties.
   * @param props.first_name - User's new first name.
   * @param props.last_name - User's new last name.
   * @param props.email - User's new email.
   * @param props.phone - User's new phone number.
   * @param props.company - User's new company name.
   * @param props.avatar - (optional) User's new profile picture.
   * @returns IrminAPIResponse containing the updated profile.
   */
  async updateProfile({
    first_name,
    last_name,
    email,
    phone,
    company,
    avatar,
  }: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    company?: string;
    avatar?: File | Blob;
  }): Promise<IrminAPIResponse<User>> {
    if (isOfflineMode) return fake(exampleProfile) as IrminAPIResponse<User>;
    const formData = new FormData();
    if (first_name) formData.append('first_name', first_name);
    if (last_name) formData.append('last_name', last_name);
    if (email) formData.append('email', email);
    if (phone) formData.append('phone', phone);
    if (company) formData.append('company', company);
    if (avatar) formData.append('profile_picture', avatar);
    try {
      const response = (await this.irminCore.fetchAPI(`/v1/profile`, {
        method: 'PATCH',
        body: formData,
      })) as IrminAPIResponse<User>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Update profile error');
      if (isDevelopment) return fake(exampleProfile) as IrminAPIResponse<User>;
      throw error;
    }
  }
}

export default ProfileService;
