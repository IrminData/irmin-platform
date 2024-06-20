import { UserProfileAPIResponse } from '@/types/UserProfile';

const api_base = process.env.NEXT_PUBLIC_API_URL;

class AuthService {
  private static instance: AuthService;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /*
   * Fetch data from the API with credentials
   * @param {string} url - The URL to fetch data from
   * @param {RequestInit} options - The fetch options
   * @returns {Promise<WorkspaceAPIResponse>} A promise that resolves to a WorkspaceAPIResponse object
   * */
  private async fetchWithCredentials(
    url: string,
    options: RequestInit
  ): Promise<UserProfileAPIResponse> {
    const response = await fetch(url, {
      ...options,
      credentials: 'include', // Include credentials with every request
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Accept-Language': navigator.language ?? 'en',
        Referer: window.location.origin,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Request failed');
    }

    return response.json();
  }

  /*
   * Login a user
   * @param {string} email - The user's email address
   * @param {string} password - The user's password
   * @returns {Promise<UserProfileAPIResponse>} A promise that resolves to a UserProfileAPIResponse object
   * */
  async login(
    email: string,
    password: string
  ): Promise<UserProfileAPIResponse> {
    try {
      const response = await this.fetchWithCredentials(
        `${api_base}/v1/login`,
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        }
      );

      return response;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /*
   * Logout a user
   * @returns {Promise<UserProfileAPIResponse>}
   * */
  async logout(): Promise<UserProfileAPIResponse> {
    try {
      const response = await this.fetchWithCredentials(
        `${api_base}/v1/logout`,
        {
          method: 'POST',
        }
      );

      return response;
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  /*
   * Register a user
   * @param {string} name - The user's name
   * @param {string} company - The user's company
   * @param {string} email - The user's email address
   * @param {string} emailConfirmation - The user's email address confirmation
   * @param {string} password - The user's password
   * @param {string} passwordConfirmation - The user's password confirmation
   * @returns {Promise<UserProfileAPIResponse>} A promise that resolves to a UserProfileAPIResponse object
   * */
  async register(
    name: string,
    company: string,
    email: string,
    emailConfirmation: string,
    password: string,
    passwordConfirmation: string
  ): Promise<UserProfileAPIResponse> {
    try {
      const response = await this.fetchWithCredentials(
        `${api_base}/v1/register`,
        {
          method: 'POST',
          body: JSON.stringify({
            name,
            company,
            email,
            email_confirmation: emailConfirmation,
            password,
            password_confirmation: passwordConfirmation,
          }),
        }
      );

      return response;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }
}

export default AuthService;
