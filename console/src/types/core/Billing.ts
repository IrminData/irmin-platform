/**
 * Status of a workspace subscription.
 */
type SubscriptionStatus =
  | 'active'
  | 'cancelled'
  | 'past_due'
  | 'trialing'
  | 'none';

/**
 * Usage tracking dimension.
 */
export type UsageDimension =
  | 'storage'
  | 'workflow_runs'
  | 'ai_requests'
  | 'api_requests'
  | 'data_transfer'
  | 'seats'
  | 'compute_invocations'
  | 'vectorizations';

/**
 * Usage information for a single dimension.
 */
export interface UsageDimensionSummary {
  /** Usage dimension type */
  dimension: UsageDimension;
  /** Current usage quantity */
  current_usage: number;
  /** Hard usage limit (null if unlimited) */
  limit: number | null;
  /** Unit of measurement */
  unit: string;
  /** Cost rate per unit */
  rate_per_unit: number;
}

/**
 * Billing address for invoices.
 */
interface BillingAddress {
  /** Street address line 1 */
  line1: string;
  /** Street address line 2 */
  line2: string;
  /** City */
  city: string;
  /** State or region */
  state: string;
  /** Postal/ZIP code */
  postal_code: string;
  /** Two-letter country code */
  country: string;
}

/**
 * Billing info for a workspace customer.
 */
export interface BillingInfo {
  /** Company/business name for billing */
  name: string;
  /** Billing address */
  billing_address: BillingAddress | null;
  /** Tax ID as [value, type] tuple, e.g. ["FI12345678", "eu_vat"] */
  tax_id: [string, string] | null;
}

/**
 * Plan information returned from the billing API.
 */
export interface PlanInfo {
  /** Subscription status */
  status: SubscriptionStatus;
  /** Whether the workspace has a payment method on file */
  has_payment_method: boolean;
  /** Start of the current billing period */
  current_period_start: string | null;
  /** End of the current billing period */
  current_period_end: string | null;
  /** Date when the subscription was cancelled */
  cancelled_at: string | null;
  /** Free credit per meter per month in EUR */
  credit_per_meter: number;
  /** Total free credit per month in EUR */
  total_credit: number;
}
