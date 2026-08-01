import type { User } from './User';

/**
 * Represents a subscription to data changes in a connection.
 */
export interface ConnectionSubscription {
  /** Subscription hash ID */
  id: string;
  /** User-friendly name for this subscription */
  name: string;
  /** Additional context about the subscription */
  description?: string;
  /** ID of the connection this subscription monitors */
  connection_id: string;
  /** Optional list of paths to filter events */
  filter_paths?: string[];
  /** Optional list of event types to filter */
  event_types?: ('insert' | 'update' | 'delete' | 'upsert')[];
  /** Whether the subscription is currently active */
  is_active: boolean;
  /** The webhook URL for receiving events */
  webhook_url?: string;
  /** User who created this subscription */
  owner?: User;
  /** Timestamp when the subscription was created */
  created_at?: string;
  /** Timestamp when the subscription was last updated */
  updated_at?: string;
}

/**
 * Subscription with webhook token (only returned on creation)
 */
export interface ConnectionSubscriptionWithToken extends ConnectionSubscription {
  /** The secret webhook token (only shown on creation) */
  webhook_token?: string;
}

/**
 * Request body for creating a subscription
 */
export interface CreateConnectionSubscriptionRequest {
  name: string;
  description?: string;
  filter_paths?: string[];
  event_types?: ('insert' | 'update' | 'delete' | 'upsert')[];
}

/**
 * Request body for updating a subscription
 */
export interface UpdateConnectionSubscriptionRequest {
  name?: string;
  description?: string;
  filter_paths?: string[];
  event_types?: ('insert' | 'update' | 'delete' | 'upsert')[];
  is_active?: boolean;
}
