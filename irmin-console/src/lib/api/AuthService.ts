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
 * Authentication API service
 *
 * @remarks
 *
 * This service calls the Irmin API and is responsible for all auth and profile
 * related API calls.
 */
class AuthService {
  private static instance: AuthService;
  private locale: Locale = defaultLocale;

  private constructor(locale: Locale) {
    this.locale = locale;
  }

  /**
   * Get the instance of the {@link AuthService}
   * @param locale - The locale to use for the instance
   */
  public static getInstance(locale: Locale): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService(locale);
    } else {
      // Update the locale if the instance already exists
      AuthService.instance.setLocale(locale);
    }
    return AuthService.instance;
  }

  /**
   * Set the locale for the instance
   * @param locale - The locale to set
   */
  public setLocale(locale: Locale) {
    this.locale = locale;
  }

  /**
   * Login a user
   * @param email - The user's email address
   * @param password - The user's password
   * @returns response from the API or example data
   * {@link https://api.irmin.dev/docs#authentication-POSTv1-login | Irmin API docs}
   */
  async login(email: string, password: string): Promise<IrminAPIResponse> {
    if (isOfflineMode) return exampleAPIResponse;
    try {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('password', password);
      const response = await fetchWithCredentials(
        `${api_base}/v1/login`,
        {
          method: 'POST',
          body: formData,
        },
        this.locale
      );

      return response;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Logout a user
   * @returns response from the API or example data
   * {@link https://api.irmin.dev/docs#authentication-POSTv1-logout | Irmin API docs}
   */
  async logout(): Promise<IrminAPIResponse> {
    if (isOfflineMode) return exampleAPIResponse;
    try {
      const response = await fetchWithCredentials(
        `${api_base}/v1/logout`,
        {
          method: 'POST',
        },
        this.locale
      );

      return response;
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  /**
   * Register a user
   * @param name - The user's name
   * @param company - The user's company
   * @param email - The user's email address
   * @param emailConfirmation - The user's email address confirmation
   * @param password - The user's password
   * @param passwordConfirmation - The user's password confirmation
   * @returns response from the API or example data
   * {@link https://api.irmin.dev/docs#authentication-POSTv1-register | Irmin API docs}
   */
  async register(
    name: string,
    company: string,
    email: string,
    emailConfirmation: string,
    password: string,
    passwordConfirmation: string
  ): Promise<IrminAPIResponse> {
    if (isOfflineMode) return exampleAPIResponse;
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('company', company);
      formData.append('email', email);
      formData.append('email_confirmation', emailConfirmation);
      formData.append('password', password);
      formData.append('password_confirmation', passwordConfirmation);

      const response = await fetchWithCredentials(`${api_base}/v1/register`, {
        method: 'POST',
        body: formData,
      });

      return response;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Get the user's profile information
   * @returns Returns the user's profile information or null if the user is not logged in
   * {@link https://api.irmin.dev/docs#account-GETv1-account-profile | Irmin API docs}
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
   * @param name - The user's name
   * @param company - The user's company
   * @param email - The user's email address
   * @returns response from the API or example data
   * {@link https://api.irmin.dev/docs#account-PATCHv1-account-profile | Irmin API docs}
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

export default AuthService;
