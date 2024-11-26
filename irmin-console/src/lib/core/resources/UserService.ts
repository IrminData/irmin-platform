import IrminCore from '@/lib/core';

import fake from '@/utils/prepareFakeResponse';

import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { User } from '@/types/core/User';
import { exampleWorkspaceUsers } from '@/types/examples/core';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment = process.env.NODE_ENV === 'development';

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
    this.fetchUser = this.fetchUser.bind(this);
    this.changeUserRole = this.changeUserRole.bind(this);
    this.removeUserFromWorkspace = this.removeUserFromWorkspace.bind(this);
  }

  /**
   * Fetch all users from the current workspace
   */
  async fetchWorkspaceUsers(): Promise<IrminAPIResponse<User[]>> {
    if (isOfflineMode)
      return fake(exampleWorkspaceUsers) as IrminAPIResponse<User[]>;
    try {
      const response = (await this.irminCore.fetchAPI(`/v1/users`, {
        method: 'GET',
      })) as IrminAPIResponse<User[]>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch users error');
      if (isDevelopment)
        return fake(exampleWorkspaceUsers) as IrminAPIResponse<User[]>;
      throw error;
    }
  }

  /**
   * Fetch a single user
   *
   * @param user - User ID
   */
  async fetchUser(user: string): Promise<IrminAPIResponse<User>> {
    if (isOfflineMode)
      return fake(exampleWorkspaceUsers[1]) as IrminAPIResponse<User>;
    try {
      const response = (await this.irminCore.fetchAPI(`/v1/users/${user}`, {
        method: 'GET',
      })) as IrminAPIResponse<User>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch user error');
      if (isDevelopment)
        return fake(exampleWorkspaceUsers[1]) as IrminAPIResponse<User>;
      throw error;
    }
  }

  /**
   * Change the role of a user in a workspace
   *
   * @param user - The ID of the user to change the role of
   * @param roles - The new roles to assign to the user
   */
  async changeUserRole(user: string, roles: string[]) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();
      formData.append('_method', 'PATCH');
      for (const role of roles) formData.append('roles', role);
      const response = await this.irminCore.fetchAPI(`/v1/users/${user}`, {
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
   *
   * @param user - The ID of the user to remove
   */
  async removeUserFromWorkspace(user: string) {
    if (isOfflineMode) return fake();
    try {
      const formData = new FormData();
      formData.append('_method', 'DELETE');

      const response = await this.irminCore.fetchAPI(`/v1/users/${user}`, {
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
