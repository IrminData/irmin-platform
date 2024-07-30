import { defaultLocale, Locale } from '@/dictionaries';
import {
  exampleAPIResponse,
  exampleRoles,
  exampleWorkspaceUser,
} from '@/lib/exampleObjects/apiObjects';
import { fetchWithCredentials } from '@/lib/fetchWithCredentials';

import { IrminAPIResponse } from '@/types/api/IrminAPIResponse';
import { IrminRole, IrminRoleNames } from '@/types/api/IrminRole';
import { WorkspaceUser } from '@/types/api/Workspace';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment =
  process.env.NEXT_PUBLIC_ENVIRONMENT_TYPE === 'development';
const api_base = process.env.NEXT_PUBLIC_API_URL;

/**
 * Users API response type
 * @internal
 */
interface UsersAPIResponse extends IrminAPIResponse {
  data: WorkspaceUser[];
}
/**
 * Roles API response type
 * @internal
 */
interface RolesAPIResponse extends IrminAPIResponse {
  data: IrminRole[];
}

/**
 * Workspace user and role API service
 *
 * Responsible for all workspace user and role related API calls.
 */
class UserAndRoleService {
  private roles: IrminRole[] = [];

  private static instance: UserAndRoleService;
  private locale: Locale = defaultLocale;

  private constructor(locale: Locale) {
    this.locale = locale;
  }

  /**
   * Get the instance of the {@link UserAndRoleService}
   * @param locale - The locale to use for the instance
   */
  public static getInstance(locale: Locale): UserAndRoleService {
    if (!UserAndRoleService.instance) {
      UserAndRoleService.instance = new UserAndRoleService(locale);
    } else {
      // Update the locale if the instance already exists
      UserAndRoleService.instance.setLocale(locale);
    }
    return UserAndRoleService.instance;
  }

  /**
   * Set the locale for the service
   * @param locale - The locale to use for the service
   */
  public setLocale(locale: Locale) {
    this.locale = locale;
  }

  /**
   * Fetch all users from the current workspace
   * {@link https://api.irmin.dev/docs#workspaces-GETv1-users | Irmin API docs}
   * @returns response from the API or example data
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
   * {@link https://api.irmin.dev/docs#roles-GETv1-roles | Irmin API docs}
   * @returns response from the API or example data
   */
  async fetchRoles(): Promise<RolesAPIResponse> {
    if (isOfflineMode) return { ...exampleAPIResponse, data: exampleRoles };
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
      if (isDevelopment) return { ...exampleAPIResponse, data: exampleRoles };
      throw error;
    }
  }

  /**
   * Get all roles stored in the roles array.
   * @returns all stored roles, empty array if none
   */
  getRoles(): IrminRole[] {
    return this.roles;
  }

  /**
   * Fetch roles for workspace user
   * {@link https://api.irmin.dev/docs#roles-GETv1-users-roles | Irmin API docs}
   * @param user - User ID
   * @returns response from the API or example data
   */
  async fetchUserRoles(user: number): Promise<RolesAPIResponse> {
    if (isOfflineMode) return { ...exampleAPIResponse, data: exampleRoles };
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
      if (isDevelopment) return { ...exampleAPIResponse, data: exampleRoles };
      throw error;
    }
  }

  /**
   * Change the role of a user in a workspace
   * {@link https://api.irmin.dev/docs#roles-PATCHv1-users-roles | Irmin API docs}
   * @param user - The ID of the user to change the role of
   * @param newRole - The new role to assign to the user
   * @param currentRole - The current role or null if user has no role
   * @returns response from the API or example data
   */
  async changeUserRole(
    user: number,
    newRole: IrminRoleNames,
    currentRole: IrminRoleNames | null
  ): Promise<IrminAPIResponse> {
    if (isOfflineMode) return exampleAPIResponse;
    try {
      const formData = new FormData();
      formData.append('_method', 'PATCH');
      formData.append('user', user.toString());
      formData.append('roles[]', newRole);
      if (currentRole) {
        formData.append('roles[]', currentRole);
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
   * {@link https://api.irmin.dev/docs#workspaces-DELETEv1-users-remove | Irmin API docs}
   * @param user - The ID of the user to remove
   * @returns response from the API or example data
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
