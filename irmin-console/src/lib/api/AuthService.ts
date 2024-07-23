import {
  exampleAPIResponse,
  exampleProfile,
} from '@/lib/exampleObjects/apiObjects';
import { fetchWithCredentials } from '@/lib/fetchWithCredentials';

import { IrminAPIResponse } from '@/types/api/IrminAPIResponse';
import { Profile } from '@/types/api/Profile';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const api_base = process.env.NEXT_PUBLIC_API_URL;

interface ProfileAPIResponse extends IrminAPIResponse {
  data: Profile;
}

class AuthService {
  private static instance: AuthService;
  private locale: string = 'en';

  private constructor(locale: string) {
    this.locale = locale;
  }

  public static getInstance(locale: string): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService(locale);
    } else {
      // Update the locale if the instance already exists
      AuthService.instance.setLocale(locale);
    }
    return AuthService.instance;
  }

  public setLocale(locale: string) {
    this.locale = locale;
  }

  /**
   * Login a user
   * @param {string} email - The user's email address
   * @param {string} password - The user's password
   * @returns {Promise<IrminAPIResponse>}
   * {@link https://api.irmin.dev/docs#authentication-POSTv1-login Irmin API docs}
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
   * @returns {Promise<IrminAPIResponse>}
   * {@link https://api.irmin.dev/docs#authentication-POSTv1-logout Irmin API docs}
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
   * @param {string} name - The user's name
   * @param {string} company - The user's company
   * @param {string} email - The user's email address
   * @param {string} emailConfirmation - The user's email address confirmation
   * @param {string} password - The user's password
   * @param {string} passwordConfirmation - The user's password confirmation
   * @returns {Promise<IrminAPIResponse>}
   * {@link https://api.irmin.dev/docs#authentication-POSTv1-register Irmin API docs}
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
   * @returns {Promise<ProfileAPIResponse>}
   * @throws {Error} An error if the request fails or the response is not OK, for example if not logged in
   * {@link https://api.irmin.dev/docs#account-GETv1-account-profile Irmin API docs}
   */
  async getProfile(): Promise<ProfileAPIResponse> {
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
      console.error('Get profile error:', error);
      throw error;
    }
  }

  /**
   * Update the user's profile information
   * @param {string} name - The user's name
   * @param {string} company - The user's company
   * @param {string} email - The user's email address
   * @returns {Promise<IrminAPIResponse>}
   * {@link https://api.irmin.dev/docs#account-PATCHv1-account-profile Irmin API docs}
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
