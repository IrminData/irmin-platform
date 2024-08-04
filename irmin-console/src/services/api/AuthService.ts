import { Locale } from '@/dictionaries';
import IrminAPI from '@/services/IrminAPI';

import { IrminAPIResponse } from '@/types/api/IrminAPIResponse';
import { exampleAPIResponse } from '@/types/examples/apiObjects';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';

/**
 * Authentication API service
 *
 * Responsible for all authenticationrelated API calls.
 */
class AuthService {
  private static instance: AuthService;
  private api: IrminAPI = IrminAPI.getInstance();

  private constructor(locale: Locale, apiToken: string) {
    this.api.setProps(locale, apiToken);
  }

  /**
   * Get the instance of the {@link AuthService}
   * @param locale - The locale to use for the instance
   * @param apiToken - The API token to use for the instance
   */
  public static getInstance(locale: Locale, apiToken: string): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService(locale, apiToken);
    } else {
      // Update the existing instance
      AuthService.instance.api.setProps(locale, apiToken);
    }
    return AuthService.instance;
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
      const response = await this.api.fetch(`/v1/login`, {
        method: 'POST',
        body: formData,
      });

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
      const response = await this.api.fetch(`/v1/logout`, {
        method: 'POST',
      });

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

      const response = await this.api.fetch(`/v1/register`, {
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
