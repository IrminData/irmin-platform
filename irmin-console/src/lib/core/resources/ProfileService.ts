import type IrminCore from '@/lib/core';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { User } from '@/types/core/User';

/**
 * Interface for updating profile
 */
interface UpdateProfileRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  company?: string;
  language?: string;
}

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
    language,
    avatar,
  }: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    company?: string;
    language?: string;
    avatar?: Blob | File;
  }): Promise<IrminAPIResponse<User>> {
    try {
      // Create update request struct with only provided fields
      const updateRequest: UpdateProfileRequest = {};
      if (first_name !== undefined) updateRequest.first_name = first_name;
      if (last_name !== undefined) updateRequest.last_name = last_name;
      if (email !== undefined) updateRequest.email = email;
      if (phone !== undefined) updateRequest.phone = phone;
      if (company !== undefined) updateRequest.company = company;
      if (language !== undefined) updateRequest.language = language;

      let response: IrminAPIResponse<User>;

      if (avatar) {
        // If profile picture is provided, use multipart form data
        const formData = new FormData();
        formData.append('metadata', JSON.stringify(updateRequest));
        formData.append('profile_picture', avatar);

        response = (await this.irminCore.fetchAPI(`/v1/profile`, {
          method: 'PATCH',
          body: formData,
        })) as IrminAPIResponse<User>;
      } else {
        // If no profile picture, use JSON content type
        response = (await this.irminCore.fetchAPI(`/v1/profile`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateRequest),
        })) as IrminAPIResponse<User>;
      }

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Update profile error');
      throw error;
    }
  }
}

export default ProfileService;
