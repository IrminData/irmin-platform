import type IrminCore from '@/lib/core';

import type {
  BillingInfo,
  PlanInfo,
  UsageDimensionSummary,
} from '@/types/core/Billing';
import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

/**
 * Billing API service
 *
 * Responsible for all billing and subscription related API calls.
 */
class BillingService {
  private irminCore: IrminCore;

  /**
   * Create a new BillingService.
   *
   * @param irminCore - The IrminCore instance.
   */
  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    this.fetchSubscription = this.fetchSubscription.bind(this);
    this.fetchUsage = this.fetchUsage.bind(this);
    this.createCheckout = this.createCheckout.bind(this);
    this.getPortalURL = this.getPortalURL.bind(this);
    this.fetchBillingInfo = this.fetchBillingInfo.bind(this);
    this.updateBillingInfo = this.updateBillingInfo.bind(this);
  }

  /**
   * Fetch the current billing subscription for a workspace.
   *
   * @param props - The parameters.
   * @param props.workspaceSlug - The workspace slug.
   * @returns IrminAPIResponse containing the PlanInfo.
   */
  async fetchSubscription({
    workspaceSlug,
  }: {
    workspaceSlug: string;
  }): Promise<IrminAPIResponse<PlanInfo>> {
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspaceSlug}/billing/subscription`,
        { method: 'GET' }
      )) as IrminAPIResponse<PlanInfo>;
      return response;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Fetch billing subscription error'
      );
      throw error;
    }
  }

  /**
   * Fetch current period usage for a workspace.
   *
   * @param props - The parameters.
   * @param props.workspaceSlug - The workspace slug.
   * @returns IrminAPIResponse containing usage dimension summaries.
   */
  async fetchUsage({
    workspaceSlug,
  }: {
    workspaceSlug: string;
  }): Promise<IrminAPIResponse<UsageDimensionSummary[]>> {
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspaceSlug}/billing/usage`,
        { method: 'GET' }
      )) as IrminAPIResponse<UsageDimensionSummary[]>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch billing usage error');
      throw error;
    }
  }

  /**
   * Create a Polar checkout session for adding a payment method.
   *
   * @param props - The parameters.
   * @param props.workspaceSlug - The workspace slug.
   * @param props.returnURL - The URL to return to after checkout.
   * @returns IrminAPIResponse containing the checkout URL.
   */
  async createCheckout({
    workspaceSlug,
    returnURL,
  }: {
    workspaceSlug: string;
    returnURL: string;
  }): Promise<IrminAPIResponse<{ checkout_url: string }>> {
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspaceSlug}/billing/checkout`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            return_url: returnURL,
          }),
        }
      )) as IrminAPIResponse<{ checkout_url: string }>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Create billing checkout error');
      throw error;
    }
  }

  /**
   * Get the Polar customer portal URL for managing billing.
   *
   * @param props - The parameters.
   * @param props.workspaceSlug - The workspace slug.
   * @returns IrminAPIResponse containing the portal URL.
   */
  async getPortalURL({
    workspaceSlug,
  }: {
    workspaceSlug: string;
  }): Promise<IrminAPIResponse<{ portal_url: string }>> {
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspaceSlug}/billing/portal`,
        { method: 'POST' }
      )) as IrminAPIResponse<{ portal_url: string }>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Get billing portal URL error');
      throw error;
    }
  }
  /**
   * Fetch billing info for a workspace.
   *
   * @param props - The parameters.
   * @param props.workspaceSlug - The workspace slug.
   * @returns IrminAPIResponse containing BillingInfo.
   */
  async fetchBillingInfo({
    workspaceSlug,
  }: {
    workspaceSlug: string;
  }): Promise<IrminAPIResponse<BillingInfo>> {
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspaceSlug}/billing/info`,
        { method: 'GET' }
      )) as IrminAPIResponse<BillingInfo>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch billing info error');
      throw error;
    }
  }

  /**
   * Update billing info for a workspace.
   *
   * @param props - The parameters.
   * @param props.workspaceSlug - The workspace slug.
   * @param props.data - The billing info fields to update.
   * @returns IrminAPIResponse containing the updated BillingInfo.
   */
  async updateBillingInfo({
    workspaceSlug,
    data,
  }: {
    workspaceSlug: string;
    data: Partial<BillingInfo>;
  }): Promise<IrminAPIResponse<BillingInfo>> {
    try {
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspaceSlug}/billing/info`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      )) as IrminAPIResponse<BillingInfo>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Update billing info error');
      throw error;
    }
  }
}

export default BillingService;
