'use client';

import { clientEnv } from '@/config/env.client';

import { TbInvoice } from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { useLocale } from '@/context/LocaleContext';

import { useBilling } from '@/hooks/api/useBilling';
import { useBaseUrl, useResourceAllowed } from '@/hooks/utils';

/**
 * Banner prompting workspaces without a payment method to configure billing.
 * Only visible when billing is enabled, user has billing:read, and no payment method is set.
 */
export default function BillingBanner() {
  const { dict } = useLocale();
  const { isResourceAllowed } = useResourceAllowed();

  const billingEnabled = !clientEnv.NEXT_PUBLIC_BILLING_DISABLED;
  const hasBillingPermission = isResourceAllowed('billing', 'read');
  const shouldFetch = billingEnabled && hasBillingPermission;

  const { subscription, subscriptionQuery } = useBilling({
    enabled: shouldFetch,
  });

  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'workspace',
    includeSegment: true,
    segmentsAfter: 1,
  });

  if (
    !billingEnabled ||
    !hasBillingPermission ||
    subscriptionQuery.isLoading ||
    subscription?.has_payment_method !== false
  ) {
    return null;
  }

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between gap-6 py-4'>
        <div className='flex items-center gap-3'>
          <TbInvoice className='size-5 shrink-0 text-muted-foreground' />
          <div className='flex flex-col gap-0.5'>
            <CardTitle className='text-sm'>
              {dict.workspace.billingBannerTitle}
            </CardTitle>
            <CardDescription className='text-xs'>
              {dict.workspace.billingBannerDescription}
            </CardDescription>
          </div>
        </div>
        <Button
          href={`${workspaceUrl}/settings/billing`}
          variant='gradient'
          size='sm'
        >
          {dict.workspace.billingBannerAction}
        </Button>
      </CardHeader>
    </Card>
  );
}
