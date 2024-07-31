import { defaultLocale, Locale } from '@/dictionaries';
import { exampleAPIResponse } from '@/lib/exampleObjects/apiObjects';
import { fetchWithCredentials } from '@/lib/fetchWithCredentials';

import { IrminAPIResponse } from '@/types/api/IrminAPIResponse';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const api_base = process.env.NEXT_PUBLIC_API_URL;

/**
 * Authentication API service
 *
 * Responsible for all authenticationrelated API calls.
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
   * {@link https://api.irmin.dev/docs#authentication-POSTv1-login | Irmin API docs}
   * @param email - The user's email address
   * @param password - The user's password
   * @returns response from the API or example data
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
   * {@link https://api.irmin.dev/docs#authentication-POSTv1-logout | Irmin API docs}
   * @returns response from the API or example data
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
   * {@link https://api.irmin.dev/docs#authentication-POSTv1-register | Irmin API docs}
   * @param name - The user's name
   * @param company - The user's company
   * @param email - The user's email address
   * @param emailConfirmation - The user's email address confirmation
   * @param password - The user's password
   * @param passwordConfirmation - The user's password confirmation
   * @returns response from the API or example data
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
}

export default AuthService;
