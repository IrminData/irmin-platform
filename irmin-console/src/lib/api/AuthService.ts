import {
  IrminAPIResponse,
  UserProfileAPIResponse,
} from '@/types/IrminAPIResponse';

const api_base = process.env.NEXT_PUBLIC_API_URL;

class AuthService {
  private static instance: AuthService;

  private constructor() {}

  // Get the singleton instance of the AuthService class
  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
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

  /**
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
      const formData = new FormData();
      formData.append('email', email);
      formData.append('password', password);
      const response = await this.fetchWithCredentials(`${api_base}/v1/login`, {
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

  /**
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
      const formData = new FormData();
      formData.append('name', name);
      formData.append('company', company);
      formData.append('email', email);
      formData.append('email_confirmation', emailConfirmation);
      formData.append('password', password);
      formData.append('password_confirmation', passwordConfirmation);

      const response = await this.fetchWithCredentials(
        `${api_base}/v1/register`,
        {
          method: 'POST',
          body: formData,
        }
      );

      return response;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Get the user's profile information
   * @returns {Promise<UserProfileAPIResponse>} A promise that resolves to a UserProfileAPIResponse object
   * @throws {Error} An error if the request fails or the response is not OK, for example if not logged in
   */
  async getProfile(): Promise<UserProfileAPIResponse> {
    try {
      const response = await this.fetchWithCredentials(
        `${api_base}/v1/account/profile`,
        {
          method: 'GET',
        }
      );
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
   * @returns {Promise<UserProfileAPIResponse>} A promise that resolves to a UserProfileAPIResponse object
   */
  async updateProfile(
    name: string,
    company: string,
    email: string
  ): Promise<UserProfileAPIResponse> {
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('company', company);
      formData.append('email', email);
      formData.append('_method', 'PATCH');

      const response = await this.fetchWithCredentials(
        `${api_base}/v1/account/profile`,
        {
          method: 'POST',
          body: formData,
        }
      );

      return response;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  /**
   * Accept the invite to the workspace.
   * @param invite - The invite's ID.
   * @param password - The user's password. Only required if you are inviting a user that doesn't already have an account.
   * @param password_confirmation - The user's password. Only required if you are inviting a user that doesn't already have an account.
   * @param company - The user's company. Only required if you are inviting a user that doesn't already have an account.
   * @returns - A promise that resolves to the response from the API. Set this if the invited user does not have an account.
   */
  async acceptUserInvite(
    invite: number,
    password: string | null,
    password_confirmation: string | null,
    company: string | null
  ): Promise<IrminAPIResponse> {
    try {
      const formData = new FormData();
      formData.append('invite', invite.toString());
      formData.append('company', company ?? '');
      formData.append('password', password ?? '');
      formData.append('password_confirmation', password_confirmation ?? '');

      return await this.fetchWithCredentials(`${api_base}/v1/invite/accept`, {
        method: 'POST',
        body: formData,
      });
    } catch (error) {
      console.error('Accept user invite error:', error);

      throw error;
    }
  }

  /**
   * Decline the invite to the workspace.
   * @param invite - The ID of the invite to decline
   * @returns - A promise that resolves to the response from the API.
   */
  async declineUserInvite(invite: number): Promise<IrminAPIResponse> {
    try {
      const formData = new FormData();
      formData.append('invite', invite.toString());
      formData.append('_method', 'DELETE');

      return await this.fetchWithCredentials(`${api_base}/v1/invite/decline`, {
        method: 'POST',
        body: formData,
      });
    } catch (error) {
      console.error('Decline user invite error:', error);

      throw error;
    }
  }
}

export default AuthService;
