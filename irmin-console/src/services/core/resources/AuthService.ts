import IrminCore from '@/services/core/IrminCore';

import fake from '@/utils/prepareFakeResponse';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';

/**
 * Authentication API service
 *
 * Responsible for all authenticationrelated API calls.
 */
class AuthService {
  private irminCore: IrminCore;

  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.login = this.login.bind(this);
    this.logout = this.logout.bind(this);
    this.register = this.register.bind(this);
  }
  /**
   * Login a user
   * {@link https://api.irmin.dev/docs#authentication-POSTv1-login | Irmin API docs}
   * @param email - The user's email address
   * @param password - The user's password
   */
  async login(email: string, password: string) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('password', password);
      const response = await this.irminCore.fetch(`/v1/login`, {
        method: 'POST',
        body: formData,
      });

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Login error');
      throw error;
    }
  }

  /**
   * Logout a user
   * {@link https://api.irmin.dev/docs#authentication-POSTv1-logout | Irmin API docs}
   */
  async logout() {
    if (isOfflineMode) return fake();
    try {
      const response = await this.irminCore.fetch(`/v1/logout`, {
        method: 'POST',
      });

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Logout error');
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
   */
  async register(
    name: string,
    company: string,
    email: string,
    emailConfirmation: string,
    password: string,
    passwordConfirmation: string
  ) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('company', company);
      formData.append('email', email);
      formData.append('email_confirmation', emailConfirmation);
      formData.append('password', password);
      formData.append('password_confirmation', passwordConfirmation);

      const response = await this.irminCore.fetch(`/v1/register`, {
        method: 'POST',
        body: formData,
      });

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Registration error');
      throw error;
    }
  }
}

export default AuthService;
