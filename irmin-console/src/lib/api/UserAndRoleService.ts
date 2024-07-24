import { defaultLocale, Locale } from '@/dictionaries';
import {
  exampleAPIResponse,
  exampleRole,
  exampleWorkspaceUser,
} from '@/lib/exampleObjects/apiObjects';
import { fetchWithCredentials } from '@/lib/fetchWithCredentials';

import { IrminAPIResponse } from '@/types/api/IrminAPIResponse';
import { IrminRole } from '@/types/api/IrminRole';
import { WorkspaceUser } from '@/types/api/Workspace';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment =
  process.env.NEXT_PUBLIC_ENVIRONMENT_TYPE === 'development';

const api_base = process.env.NEXT_PUBLIC_API_URL;

interface UsersAPIResponse extends IrminAPIResponse {
  data: WorkspaceUser[];
}
interface RolesAPIResponse extends IrminAPIResponse {
  data: IrminRole[];
}

class UserAndRoleService {
  private roles: IrminRole[] = [];

  private static instance: UserAndRoleService;
  private locale: Locale = defaultLocale;

  private constructor(locale: Locale) {
    this.locale = locale;
  }

  public static getInstance(locale: Locale): UserAndRoleService {
    if (!UserAndRoleService.instance) {
      UserAndRoleService.instance = new UserAndRoleService(locale);
    } else {
      // Update the locale if the instance already exists
      UserAndRoleService.instance.setLocale(locale);
    }
    return UserAndRoleService.instance;
  }

  public setLocale(locale: Locale) {
    this.locale = locale;
  }

  /**
   * Fetch all users from the current workspace
   * @returns {Promise<UsersAPIResponse>}
   * {@link https://api.irmin.dev/docs#workspaces-GETv1-users Irmin API docs}
   */
  async fetchAllUsers(): Promise<UsersAPIResponse> {
    if (isOfflineMode)
      return { ...exampleAPIResponse, data: [exampleWorkspaceUser] };
    try {
      const response = (await fetchWithCredentials(
        `${api_base}/v1/users`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
        this.locale
      )) as UsersAPIResponse;
      return response;
    } catch (error) {
      console.error('Fetch users error:', error);
      if (isDevelopment)
        return { ...exampleAPIResponse, data: [exampleWorkspaceUser] };
      throw error;
    }
  }

  /**
   * Fetch all available roles
   * @returns {Promise<RolesAPIResponse>}
   * {@link https://api.irmin.dev/docs#roles-GETv1-roles Irmin API docs}
   */
  async fetchRoles(): Promise<RolesAPIResponse> {
    if (isOfflineMode) return { ...exampleAPIResponse, data: [exampleRole] };
    try {
      const response = (await fetchWithCredentials(
        `${api_base}/v1/roles`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
        this.locale
      )) as RolesAPIResponse;
      this.roles = response.data;
      return response;
    } catch (error) {
      console.error('Fetch roles error:', error);
      if (isDevelopment) return { ...exampleAPIResponse, data: [exampleRole] };
      throw error;
    }
  }

  /**
   * Get all roles stored in the roles array.
   * @returns {IrminRole[]}
   */
  getRoles(): IrminRole[] {
    return this.roles;
  }

  /**
   * Fetch roles for workspace user
   * @param {number} user - User ID
   * @returns {Promise<RolesAPIResponse>}
   * {@link https://api.irmin.dev/docs#roles-GETv1-users-roles Irmin API docs}
   */
  async fetchUserRoles(user: number): Promise<RolesAPIResponse> {
    if (isOfflineMode) return { ...exampleAPIResponse, data: [exampleRole] };
    try {
      const response = (await fetchWithCredentials(
        `${api_base}/v1/users/roles?user=${user}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
        this.locale
      )) as RolesAPIResponse;
      return response;
    } catch (error) {
      console.error('Fetch user roles error:', error);
      if (isDevelopment) return { ...exampleAPIResponse, data: [exampleRole] };
      throw error;
    }
  }

  /**
   * Change the role of a user in a workspace
   * @param {number} user - The ID of the user to change the role of
   * @param {IrminRole} newRoleId - The new role
   * @param {IrminRole | null} currentRoleId - The current role or null if user has no role
   * @returns {Promise<IrminAPIResponse>}
   * {@link https://api.irmin.dev/docs#roles-PATCHv1-users-roles Irmin API docs}
   */
  async changeUserRole(
    user: number,
    newRole: IrminRole,
    currentRole: IrminRole | null
  ): Promise<IrminAPIResponse> {
    if (isOfflineMode) return exampleAPIResponse;
    try {
      const formData = new FormData();
      formData.append('_method', 'PATCH');
      formData.append('user', user.toString());
      formData.append('roles[]', newRole.name);
      if (currentRole) {
        formData.append('roles[]', currentRole.name);
      }

      const response = await fetchWithCredentials(
        `${api_base}/v1/users/roles`,
        {
          method: 'POST',
          body: formData,
        },
        this.locale
      );

      return response;
    } catch (error) {
      console.error('Change user role error:', error);
      throw error;
    }
  }

  /**
   * Remove a user from a workspace
   * @param {number} user - The ID of the user to remove
   * @returns {Promise<IrminAPIResponse>}
   * {@link https://api.irmin.dev/docs#workspaces-DELETEv1-users-remove Irmin API docs}
   */
  async removeUserFromWorkspace(user: number): Promise<IrminAPIResponse> {
    if (isOfflineMode) return exampleAPIResponse;
    try {
      const formData = new FormData();
      formData.append('_method', 'DELETE');
      formData.append('user', user.toString());

      const response = await fetchWithCredentials(
        `${api_base}/v1/users/remove`,
        {
          method: 'POST',
          body: formData,
        },
        this.locale
      );

      return response;
    } catch (error) {
      console.error('Remove user from workspace error:', error);
      throw error;
    }
  }
}

export default UserAndRoleService;
