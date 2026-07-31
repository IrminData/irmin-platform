import type IrminCore from '@/lib/core';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type {
  Policy,
  PolicyAction,
  PolicyEffect,
  PolicyPrincipal,
  PolicyResource,
  PolicyResourceOptions,
  RolePolicySummary,
  UserPolicySummary,
} from '@/types/core/Policy';

/**
 * Interface for creating a policy
 */
interface CreatePolicyRequest {
  effect: PolicyEffect;
  action: PolicyAction;
  resource: PolicyResource;
  principal: PolicyPrincipal;
  resource_id?: string;
  role_id?: string;
  user_id?: string;
}

/**
 * Interface for updating a policy
 */
interface UpdatePolicyRequest {
  effect?: PolicyEffect;
  action?: PolicyAction;
  resource?: PolicyResource;
  principal?: PolicyPrincipal;
  resource_id?: string;
  role_id?: string;
  user_id?: string;
}

/**
 * Policy API service
 *
 * Responsible for all Policy related API calls.
 */
class PolicyService {
  private irminCore: IrminCore;

  /**
   * Create a new PolicyService.
   *
   * @param irminCore - The IrminCore instance for API calls.
   */
  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.listPolicies = this.listPolicies.bind(this);
    this.getPolicy = this.getPolicy.bind(this);
    this.createPolicy = this.createPolicy.bind(this);
    this.updatePolicy = this.updatePolicy.bind(this);
    this.deletePolicy = this.deletePolicy.bind(this);
    this.getPolicyRoleSummary = this.getPolicyRoleSummary.bind(this);
    this.getPolicyUserSummary = this.getPolicyUserSummary.bind(this);
    this.checkPermission = this.checkPermission.bind(this);
    this.getPolicyResourceOptions = this.getPolicyResourceOptions.bind(this);
  }

  /**
   * List all policies in a workspace.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @returns IrminAPIResponse containing an array of Policy.
   */
  async listPolicies({
    workspace,
    effect,
    action,
    resource,
    principal,
    resourceId,
    roleId,
    userId,
  }: {
    workspace: string;
    effect?: PolicyEffect;
    action?: PolicyAction;
    resource?: PolicyResource;
    principal?: PolicyPrincipal;
    resourceId?: string;
    roleId?: string;
    userId?: string;
  }): Promise<IrminAPIResponse<Policy[]>> {
    try {
      const params = new URLSearchParams();

      if (effect) params.append('effect', effect);
      if (action) params.append('action', action);
      if (resource) params.append('resource', resource);
      if (principal) params.append('principal', principal);
      if (resourceId) params.append('resource_id', resourceId);
      if (roleId) params.append('role_id', roleId);
      if (userId) params.append('user_id', userId);

      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/policies?${params.toString()}`,
        { method: 'GET' }
      )) as IrminAPIResponse<Policy[]>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'List Policies error');
      throw error;
    }
  }

  /**
   * Get a single policy by its ID.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.policyId - The policy ID.
   * @returns IrminAPIResponse containing the Policy.
   */
  async getPolicy({
    workspace,
    policyId,
  }: {
    workspace: string;
    policyId: string;
  }): Promise<IrminAPIResponse<Policy>> {
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/policies/${policyId}`,
        { method: 'GET' }
      )) as IrminAPIResponse<Policy>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Get Policy error');
      throw error;
    }
  }

  /**
   * Create a new policy.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.effect - The effect of the policy (allow/deny).
   * @param props.action - The action being controlled (read/write/etc).
   * @param props.resource - The resource type being controlled.
   * @param props.principal - The principal type (role/user).
   * @param props.resourceId - Optional ID of the specific resource.
   * @param props.roleId - Optional ID of the role if principal is role.
   * @param props.userId - Optional ID of the user if principal is user.
   * @returns IrminAPIResponse containing the newly created Policy.
   */
  async createPolicy({
    workspace,
    effect,
    action,
    resource,
    principal,
    resourceId,
    roleId,
    userId,
  }: {
    workspace: string;
    effect: PolicyEffect;
    action: PolicyAction;
    resource: PolicyResource;
    principal: PolicyPrincipal;
    resourceId?: string;
    roleId?: string;
    userId?: string;
  }): Promise<IrminAPIResponse<Policy>> {
    try {
      const requestBody: CreatePolicyRequest = {
        effect,
        action,
        resource,
        principal,
        resource_id: resourceId,
        role_id: roleId,
        user_id: userId,
      };

      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/policies`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );
      return response as IrminAPIResponse<Policy>;
    } catch (error) {
      console.error((error as Error).message, 'Create Policy error');
      throw error;
    }
  }

  /**
   * Update an existing policy.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.policyId - The policy ID.
   * @param props.effect - Optional new effect of the policy.
   * @param props.action - Optional new action.
   * @param props.resource - Optional new resource type.
   * @param props.principal - Optional new principal type.
   * @param props.resourceId - Optional new resource ID.
   * @param props.roleId - Optional new role ID.
   * @param props.userId - Optional new user ID.
   * @returns IrminAPIResponse containing the updated Policy.
   */
  async updatePolicy({
    workspace,
    policyId,
    effect,
    action,
    resource,
    principal,
    resourceId,
    roleId,
    userId,
  }: {
    workspace: string;
    policyId: string;
    effect?: PolicyEffect;
    action?: PolicyAction;
    resource?: PolicyResource;
    principal?: PolicyPrincipal;
    resourceId?: string;
    roleId?: string;
    userId?: string;
  }): Promise<IrminAPIResponse<Policy>> {
    try {
      const requestBody: UpdatePolicyRequest = {};

      if (effect !== undefined) requestBody.effect = effect;
      if (action !== undefined) requestBody.action = action;
      if (resource !== undefined) requestBody.resource = resource;
      if (principal !== undefined) requestBody.principal = principal;
      if (resourceId !== undefined) requestBody.resource_id = resourceId;
      if (roleId !== undefined) requestBody.role_id = roleId;
      if (userId !== undefined) requestBody.user_id = userId;

      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/policies/${policyId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );
      return response as IrminAPIResponse<Policy>;
    } catch (error) {
      console.error((error as Error).message, 'Update Policy error');
      throw error;
    }
  }

  /**
   * Delete a policy.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.policyId - The policy ID.
   * @returns IrminAPIResponse containing the deletion result.
   */
  async deletePolicy({
    workspace,
    policyId,
  }: {
    workspace: string;
    policyId: string;
  }): Promise<IrminAPIResponse> {
    try {
      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/policies/${policyId}`,
        { method: 'DELETE' }
      );
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Delete Policy error');
      throw error;
    }
  }

  /**
   * Get a summary of policies that apply to roles.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @returns IrminAPIResponse containing an array of RolePolicySummary.
   */
  async getPolicyRoleSummary({
    workspace,
  }: {
    workspace: string;
  }): Promise<IrminAPIResponse<RolePolicySummary[]>> {
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/policies/role-summary`,
        { method: 'GET' }
      )) as IrminAPIResponse<RolePolicySummary[]>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Get Policy Role Summary error');
      throw error;
    }
  }

  /**
   * Get a summary of policies that apply to the current user.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @returns IrminAPIResponse containing the UserPolicySummary.
   */
  async getPolicyUserSummary({
    workspace,
  }: {
    workspace: string;
  }): Promise<IrminAPIResponse<UserPolicySummary>> {
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/policies/my`,
        { method: 'GET' }
      )) as IrminAPIResponse<UserPolicySummary>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Get Policy User Summary error');
      throw error;
    }
  }

  /**
   * Check if the current user has permission to perform an action on a resource.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.resource - The resource type.
   * @param props.action - The action to check.
   * @param props.resourceId - Optional ID of the specific resource.
   * @returns Promise<boolean> indicating whether the user has permission.
   */
  async checkPermission({
    workspace,
    resource,
    action,
    resourceId,
  }: {
    workspace: string;
    resource: PolicyResource;
    action: PolicyAction;
    resourceId?: string;
  }): Promise<boolean> {
    try {
      let endpoint = `/v1/workspaces/${workspace}/policies/can?resource=${resource}&action=${action}`;
      if (resourceId) {
        endpoint += `&resource_id=${resourceId}`;
      }

      await this.irminCore.fetchAPI(endpoint, { method: 'GET' });
      return true;
    } catch {
      // If the request fails, the user does not have permission
      return false;
    }
  }

  /**
   * Get all possible policy resource options for a given workspace.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @returns IrminAPIResponse containing the PolicyResourceOptions.
   */
  async getPolicyResourceOptions({
    workspace,
  }: {
    workspace: string;
  }): Promise<IrminAPIResponse<PolicyResourceOptions>> {
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/policies/resource-options`,
        { method: 'GET' }
      )) as IrminAPIResponse<PolicyResourceOptions>;
      return response;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Get Policy Resource Options error'
      );
      throw error;
    }
  }
}

export default PolicyService;
