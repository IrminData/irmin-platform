import IrminCore from '@/lib/core';

import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { IrminRole } from '@/types/core/IrminRole';
import { User } from '@/types/core/User';

/**
 * Workspace User API service
 *
 * Responsible for Workspace User related API calls.
 */
class UserService {
  private irminCore: IrminCore;

  /**
   * Create a new UserService.
   *
   * @param irminCore - The IrminCore instance for API calls.
   */
  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.fetchWorkspaceUsers = this.fetchWorkspaceUsers.bind(this);
    this.fetchUser = this.fetchUser.bind(this);
    this.changeUserRole = this.changeUserRole.bind(this);
    this.removeUserFromWorkspace = this.removeUserFromWorkspace.bind(this);
  }

  /**
   * Fetch all users from a workspace.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @returns IrminAPIResponse containing an array of User.
   */
  async fetchWorkspaceUsers({
    workspace,
  }: {
    workspace: string;
  }): Promise<IrminAPIResponse<User[]>> {
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/users`,
        { method: 'GET' }
      )) as IrminAPIResponse<User[]>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch users error');
      throw error;
    }
  }

  /**
   * Fetch a single user by ID.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.user - The user ID.
   * @returns IrminAPIResponse containing the User.
   */
  async fetchUser({
    workspace,
    user,
  }: {
    workspace: string;
    user: string;
  }): Promise<IrminAPIResponse<User>> {
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/users/${user}`,
        { method: 'GET' }
      )) as IrminAPIResponse<User>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch user error');
      throw error;
    }
  }

  /**
   * Change the roles of a user in a workspace.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.user - The user ID.
   * @param props.roles - The new roles to assign to the user.
   * @returns IrminAPIResponse containing the updated User.
   */
  async changeUserRole({
    workspace,
    user,
    roles,
  }: {
    workspace: string;
    user: string;
    roles: IrminRole[];
  }): Promise<IrminAPIResponse<User>> {
    try {
      const formData = new FormData();
      // Append each role; the server will combine them as needed
      for (const role of roles) {
        formData.append('roles', role);
      }
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/users/${user}`,
        {
          method: 'PATCH',
          body: formData,
        }
      )) as IrminAPIResponse<User>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Change user role error');
      throw error;
    }
  }

  /**
   * Remove a user from a workspace.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.user - The user ID to remove.
   * @returns IrminAPIResponse containing the result of the deletion.
   */
  async removeUserFromWorkspace({
    workspace,
    user,
  }: {
    workspace: string;
    user: string;
  }): Promise<IrminAPIResponse> {
    try {
      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/users/${user}`,
        { method: 'DELETE' }
      );
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
