import { defaultLocale, Locale } from '@/dictionaries';
import {
  exampleAPIResponse,
  exampleProfile,
} from '@/lib/exampleObjects/apiObjects';
import { fetchWithCredentials } from '@/lib/fetchWithCredentials';

import { IrminAPIResponse } from '@/types/api/IrminAPIResponse';
import { Profile } from '@/types/api/Profile';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const api_base = process.env.NEXT_PUBLIC_API_URL;

/**
 * Profile API response type
 * @internal
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
  private static instance: ProfileService;
  private locale: Locale = defaultLocale;

  private constructor(locale: Locale) {
    this.locale = locale;
  }

  /**
   * Get the instance of the {@link ProfileService}
   * @param locale - The locale to use for the instance
   */
  public static getInstance(locale: Locale): ProfileService {
    if (!ProfileService.instance) {
      ProfileService.instance = new ProfileService(locale);
    } else {
      // Update the locale if the instance already exists
      ProfileService.instance.setLocale(locale);
    }
    return ProfileService.instance;
  }

  /**
   * Set the locale for the instance
   * @param locale - The locale to set
   */
  public setLocale(locale: Locale) {
    this.locale = locale;
  }

  /**
   * Get the user's profile information
   * {@link https://api.irmin.dev/docs#account-GETv1-account-profile | Irmin API docs}
   * @returns Returns the user's profile information or null if the user is not logged in
   */
  async getProfile(): Promise<ProfileAPIResponse | null> {
    if (isOfflineMode) return { ...exampleAPIResponse, data: exampleProfile };
    try {
      const response = (await fetchWithCredentials(
        `${api_base}/v1/account/profile`,
        {
          method: 'GET',
        },
        this.locale
      )) as ProfileAPIResponse;
      return response;
    } catch (error) {
      // Check if the error is due to not being logged in
      if ((error as { message: string }).message === 'Unauthenticated.') {
        // If the user isn't logged in, log a message and return null
        console.log("User isn't logged in");
        return null;
      }
      // If not, log and throw the error
      console.error('Get profile error:', error);
      throw error;
    }
  }

  /**
   * Update the user's profile information
   * {@link https://api.irmin.dev/docs#account-PATCHv1-account-profile | Irmin API docs}
   * @param name - The user's name
   * @param company - The user's company
   * @param email - The user's email address
   * @returns response from the API or example data
   */
  async updateProfile(
    name: string,
    company: string,
    email: string
  ): Promise<IrminAPIResponse> {
    if (isOfflineMode) return exampleAPIResponse;
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('company', company);
      formData.append('email', email);
      formData.append('_method', 'PATCH');

      const response = await fetchWithCredentials(
        `${api_base}/v1/account/profile`,
        {
          method: 'POST',
          body: formData,
        },
        this.locale
      );
      return response;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }
}

export default ProfileService;
