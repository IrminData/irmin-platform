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
  | 'seats';

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
