'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { useLocale } from '@/context/LocaleContext';

import type { PlanInfo } from '@/types/core/Billing';

/**
 * Displays the current billing plan information with management actions.
 *
 * @param props - Component props.
 * @param props.plan - The current plan information.
 * @param props.onAddPaymentMethod - Callback to start checkout for adding a payment method.
 * @param props.onManageBilling - Callback to open Polar billing portal.
 * @param props.isCheckoutLoading - Whether the checkout button is loading.
 * @param props.isPortalLoading - Whether the portal button is loading.
 */
const BillingPlanCard = ({
  plan,
  onAddPaymentMethod,
  onManageBilling,
  isCheckoutLoading,
  isPortalLoading,
}: {
  plan: PlanInfo | undefined;
  onAddPaymentMethod: () => void;
  onManageBilling: () => void;
  isCheckoutLoading: boolean;
  isPortalLoading: boolean;
}) => {
  const { dict } = useLocale();

  const hasPaymentMethod = plan?.has_payment_method ?? false;

  const statusLabel = plan
    ? ({
        active: dict.workspace.billingStatusActive,
        cancelled: dict.workspace.billingStatusCancelled,
        past_due: dict.workspace.billingStatusPastDue,
        trialing: dict.workspace.billingStatusTrialing,
        none: dict.workspace.billingStatusNone,
      }[plan.status] ?? plan.status)
    : '';

  const statusVariant =
    plan?.status === 'active' || plan?.status === 'trialing'
      ? 'primary'
      : plan?.status === 'past_due'
        ? 'destructive'
        : 'secondary';

  const renewalDate = plan?.current_period_end
    ? new Date(plan.current_period_end).toLocaleDateString()
    : null;

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <CardTitle>{dict.workspace.billingCurrentPlan}</CardTitle>
          {statusLabel && <Badge variant={statusVariant}>{statusLabel}</Badge>}
        </div>
        <CardDescription>
          {plan?.status === 'cancelled'
            ? dict.workspace.billingCancelled
            : plan?.status === 'past_due'
              ? dict.workspace.billingPastDue
              : hasPaymentMethod
                ? dict.workspace.billingSubscribed
                : dict.workspace.billingFreeUser}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className='flex flex-col gap-4'>
          {renewalDate && plan?.status !== 'cancelled' && (
            <p className='text-sm text-muted-foreground'>
              {dict.workspace.billingRenewsOn} {renewalDate}
            </p>
          )}
          {renewalDate && plan?.status === 'cancelled' && (
            <p className='text-sm text-muted-foreground'>
              {dict.workspace.billingAccessUntil} {renewalDate}
            </p>
          )}
          {plan?.cancelled_at && (
            <p className='text-sm text-destructive'>
              {dict.workspace.billingStatusCancelled}:{' '}
              {new Date(plan.cancelled_at).toLocaleDateString()}
            </p>
          )}
          <div className='flex gap-2'>
            {!hasPaymentMethod && (
              <Button
                size='sm'
                onClick={onAddPaymentMethod}
                disabled={isCheckoutLoading}
              >
                {dict.workspace.billingAddPaymentMethod}
              </Button>
            )}
            {hasPaymentMethod && (
              <Button
                size='sm'
                onClick={onManageBilling}
                disabled={isPortalLoading}
              >
                {dict.workspace.billingManageBilling}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BillingPlanCard;
