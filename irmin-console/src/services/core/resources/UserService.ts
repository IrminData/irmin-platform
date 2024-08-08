import IrminCore from '@/services/core/IrminCore';

import fake from '@/utils/prepareFakeResponse';

import { IrminAPIResponse } from '@/types/api/IrminAPIResponse';
import { IrminRole, IrminRoleNames } from '@/types/api/IrminRole';
import { WorkspaceUser } from '@/types/api/Workspace';
import { exampleRoles, exampleWorkspaceUsers } from '@/types/examples/base';

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
 * Workspace user API service
 *
 * Responsible for Workspace User related API calls.
 */
class UserService {
  private irminCore: IrminCore;

  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.fetchWorkspaceUsers = this.fetchWorkspaceUsers.bind(this);
    this.fetchUserRoles = this.fetchUserRoles.bind(this);
    this.changeUserRole = this.changeUserRole.bind(this);
    this.removeUserFromWorkspace = this.removeUserFromWorkspace.bind(this);
  }

  /**
   * Fetch all users from the current workspace
   * {@link https://api.irmin.dev/docs#workspaces-GETv1-users | Irmin API docs}
   */
  async fetchWorkspaceUsers(): Promise<UsersAPIResponse> {
    if (isOfflineMode) return fake(exampleWorkspaceUsers) as UsersAPIResponse;
    try {
      const response = (await this.irminCore.fetch(`/v1/users`, {
        method: 'GET',
      })) as UsersAPIResponse;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch users error');
      if (isDevelopment) return fake(exampleWorkspaceUsers) as UsersAPIResponse;
      throw error;
    }
  }

  /**
   * Fetch roles for workspace user
   * {@link https://api.irmin.dev/docs#roles-GETv1-users-roles | Irmin API docs}
   * @param user - User ID
   */
  async fetchUserRoles(user: number): Promise<RolesAPIResponse> {
    if (isOfflineMode) return fake(exampleRoles) as RolesAPIResponse;
    try {
      const response = (await this.irminCore.fetch(
        `/v1/users/roles?user=${user}`,
        {
          method: 'GET',
        }
      )) as RolesAPIResponse;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch user roles error');
      if (isDevelopment) return fake(exampleRoles) as RolesAPIResponse;
      throw error;
    }
  }

  /**
   * Change the role of a user in a workspace
   * {@link https://api.irmin.dev/docs#roles-PATCHv1-users-roles | Irmin API docs}
   * @param user - The ID of the user to change the role of
   * @param newRole - The new role to assign to the user
   * @param currentRole - The current role or null if user has no role
   */
  async changeUserRole(
    user: number,
    newRole: IrminRoleNames,
    currentRole: IrminRoleNames | null
  ) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();
      formData.append('_method', 'PATCH');
      formData.append('user', user.toString());
      formData.append('roles[]', newRole);
      if (currentRole) {
        formData.append('roles[]', currentRole);
      }

      const response = await this.irminCore.fetch(`/v1/users/roles`, {
        method: 'POST',
        body: formData,
      });

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Change user role error');
      throw error;
    }
  }

  /**
   * Remove a user from a workspace
   * {@link https://api.irmin.dev/docs#workspaces-DELETEv1-users-remove | Irmin API docs}
   * @param user - The ID of the user to remove
   */
  async removeUserFromWorkspace(user: number) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();
      formData.append('_method', 'DELETE');
      formData.append('user', user.toString());

      const response = await this.irminCore.fetch(`/v1/users/remove`, {
        method: 'POST',
        body: formData,
      });

      return response;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Remove user from workspace error'
      );
      throw error;
    }
  }
}

export default UserService;
