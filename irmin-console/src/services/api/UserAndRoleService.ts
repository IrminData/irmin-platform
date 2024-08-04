import { Locale } from '@/dictionaries';
import IrminAPI from '@/services/IrminAPI';

import { IrminAPIResponse } from '@/types/api/IrminAPIResponse';
import { IrminRole, IrminRoleNames } from '@/types/api/IrminRole';
import { WorkspaceUser } from '@/types/api/Workspace';
import {
  exampleAPIResponse,
  exampleRoles,
  exampleWorkspaceUsers,
} from '@/types/examples/apiObjects';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment =
  process.env.NEXT_PUBLIC_ENVIRONMENT_TYPE === 'development';

/**
 * Users API response type
 */
interface UsersAPIResponse extends IrminAPIResponse {
  data: WorkspaceUser[];
}
/**
 * Roles API response type
 */
export interface RolesAPIResponse extends IrminAPIResponse {
  data: IrminRole[];
}

/**
 * Workspace user and role API service
 *
 * Responsible for all workspace user and role related API calls.
 */
class UserAndRoleService {
  private static instance: UserAndRoleService;
  private api: IrminAPI = IrminAPI.getInstance();

  private constructor(locale: Locale, apiToken: string) {
    this.api.setProps(locale, apiToken);
  }

  /**
   * Get the instance of the {@link UserAndRoleService}
   * @param locale - The locale to use for the instance
   * @param apiToken - The API token to use for the instance
   */
  public static getInstance(
    locale: Locale,
    apiToken: string
  ): UserAndRoleService {
    if (!UserAndRoleService.instance) {
      UserAndRoleService.instance = new UserAndRoleService(locale, apiToken);
    } else {
      // Update the existing instance
      UserAndRoleService.instance.api.setProps(locale, apiToken);
    }
    return UserAndRoleService.instance;
  }

  /**
   * Fetch all users from the current workspace
   * {@link https://api.irmin.dev/docs#workspaces-GETv1-users | Irmin API docs}
   * @returns response from the API or example data
   */
  async fetchAllUsers(): Promise<UsersAPIResponse> {
    if (isOfflineMode)
      return { ...exampleAPIResponse, data: exampleWorkspaceUsers };
    try {
      const response = (await this.api.fetch(`/v1/users`, {
        method: 'GET',
      })) as UsersAPIResponse;
      return response;
    } catch (error) {
      console.error('Fetch users error:', error);
      if (isDevelopment)
        return { ...exampleAPIResponse, data: exampleWorkspaceUsers };
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
      const response = (await this.api.fetch(`/v1/roles`, {
        method: 'GET',
      })) as RolesAPIResponse;
      return response;
    } catch (error) {
      console.error('Fetch roles error:', error);
      if (isDevelopment) return { ...exampleAPIResponse, data: exampleRoles };
      throw error;
    }
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
      const response = (await this.api.fetch(`/v1/users/roles?user=${user}`, {
        method: 'GET',
      })) as RolesAPIResponse;
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

      const response = await this.api.fetch(`/v1/users/roles`, {
        method: 'POST',
        body: formData,
      });

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

      const response = await this.api.fetch(`/v1/users/remove`, {
        method: 'POST',
        body: formData,
      });

      return response;
    } catch (error) {
      console.error('Remove user from workspace error:', error);
      throw error;
    }
  }
}

export default UserAndRoleService;
