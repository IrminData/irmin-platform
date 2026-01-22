import type IrminCore from '@/lib/core';

import type {
  ConnectionSubscription,
  ConnectionSubscriptionWithToken,
  CreateConnectionSubscriptionRequest,
  UpdateConnectionSubscriptionRequest,
} from '@/types/core/ConnectionSubscription';
import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

/**
 * Connection Subscription API service
 *
 * Provides methods to interact with connection subscription endpoints.
 */
class ConnectionSubscriptionService {
  private irminCore: IrminCore;

  /**
   * Create a new ConnectionSubscriptionService.
   *
   * @param irminCore - The IrminCore instance.
   */
  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.fetchSubscriptions = this.fetchSubscriptions.bind(this);
    this.createSubscription = this.createSubscription.bind(this);
    this.updateSubscription = this.updateSubscription.bind(this);
    this.deleteSubscription = this.deleteSubscription.bind(this);
    this.regenerateToken = this.regenerateToken.bind(this);
  }

  /**
   * Fetch all subscriptions for a connection.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.connectionID - The connection ID.
   * @returns IrminAPIResponse containing an array of ConnectionSubscription.
   */
  async fetchSubscriptions({
    workspace,
    connectionID,
  }: {
    workspace: string;
    connectionID: string;
  }): Promise<IrminAPIResponse<ConnectionSubscription[]>> {
    try {
      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/connections/${connectionID}/subscriptions`,
        { method: 'GET' }
      );
      return response as IrminAPIResponse<ConnectionSubscription[]>;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Fetch connection subscriptions error'
      );
      throw error;
    }
  }

  /**
   * Create a new subscription for a connection.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.connectionID - The connection ID.
   * @param props.data - The subscription data.
   * @returns IrminAPIResponse containing the new ConnectionSubscriptionWithToken.
   */
  async createSubscription({
    workspace,
    connectionID,
    data,
  }: {
    workspace: string;
    connectionID: string;
    data: CreateConnectionSubscriptionRequest;
  }): Promise<IrminAPIResponse<ConnectionSubscriptionWithToken>> {
    try {
      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/connections/${connectionID}/subscriptions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );
      return response as IrminAPIResponse<ConnectionSubscriptionWithToken>;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Create connection subscription error'
      );
      throw error;
    }
  }

  /**
   * Update an existing subscription.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.connectionID - The connection ID.
   * @param props.subscriptionID - The subscription ID to update.
   * @param props.data - The subscription data to update.
   * @returns IrminAPIResponse containing the updated ConnectionSubscription.
   */
  async updateSubscription({
    workspace,
    connectionID,
    subscriptionID,
    data,
  }: {
    workspace: string;
    connectionID: string;
    subscriptionID: string;
    data: UpdateConnectionSubscriptionRequest;
  }): Promise<IrminAPIResponse<ConnectionSubscription>> {
    try {
      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/connections/${connectionID}/subscriptions/${subscriptionID}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );
      return response as IrminAPIResponse<ConnectionSubscription>;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Update connection subscription error'
      );
      throw error;
    }
  }

  /**
   * Delete a subscription.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.connectionID - The connection ID.
   * @param props.subscriptionID - The subscription ID to delete.
   * @returns IrminAPIResponse containing the result of deletion.
   */
  async deleteSubscription({
    workspace,
    connectionID,
    subscriptionID,
  }: {
    workspace: string;
    connectionID: string;
    subscriptionID: string;
  }): Promise<IrminAPIResponse> {
    try {
      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/connections/${connectionID}/subscriptions/${subscriptionID}`,
        { method: 'DELETE' }
      );
      return response;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Delete connection subscription error'
      );
      throw error;
    }
  }

  /**
   * Regenerate the webhook token for a subscription.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.connectionID - The connection ID.
   * @param props.subscriptionID - The subscription ID.
   * @returns IrminAPIResponse containing the updated ConnectionSubscriptionWithToken.
   */
  async regenerateToken({
    workspace,
    connectionID,
    subscriptionID,
  }: {
    workspace: string;
    connectionID: string;
    subscriptionID: string;
  }): Promise<IrminAPIResponse<ConnectionSubscriptionWithToken>> {
    try {
      const response = await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/connections/${connectionID}/subscriptions/${subscriptionID}/regenerate-token`,
        { method: 'POST' }
      );
      return response as IrminAPIResponse<ConnectionSubscriptionWithToken>;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Regenerate subscription token error'
      );
      throw error;
    }
  }
}

export default ConnectionSubscriptionService;
