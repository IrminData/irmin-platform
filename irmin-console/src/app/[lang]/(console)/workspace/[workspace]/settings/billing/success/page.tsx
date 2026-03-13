'use client';

import { useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { ContentWrapper } from '@/components/ui/ContentWrapper';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { useBilling } from '@/hooks/api/useBilling';

const MAX_POLL_COUNT = 30;

/**
 * Post-checkout success page.
 *
 * Polls the subscription endpoint until the webhook is processed,
 * then redirects back to the billing settings page.
 */
export default function BillingSuccessPage() {
  const { dict, locale } = useLocale();
  const { workspaceSlug } = useWorkspaceContext();
  const { subscriptionQuery, subscription } = useBilling();
  const router = useRouter();
  const [pollCount, setPollCount] = useState(0);
  const refetchRef = useRef(subscriptionQuery.refetch);

  const timedOut = pollCount >= MAX_POLL_COUNT;
  const hasError = subscriptionQuery.isError;
  const showSpinner = !timedOut && !hasError;

  useEffect(() => {
    refetchRef.current = subscriptionQuery.refetch;
  }, [subscriptionQuery.refetch]);

  useEffect(() => {
    // If subscription is active, redirect to billing settings
    if (
      subscription?.status === 'active' ||
      subscription?.status === 'trialing'
    ) {
      router.replace(`/${locale}/workspace/${workspaceSlug}/settings/billing`);
      return;
    }

    // Stop polling if the API is consistently failing
    if (subscriptionQuery.isError) {
      return;
    }

    // Poll every 2 seconds, up to MAX_POLL_COUNT times
    if (pollCount < MAX_POLL_COUNT) {
      const timer = setTimeout(() => {
        refetchRef.current();
        setPollCount((prev) => prev + 1);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [
    subscription?.status,
    subscriptionQuery.isError,
    pollCount,
    router,
    locale,
    workspaceSlug,
  ]);

  const statusMessage = hasError
    ? dict.workspace.billingCheckoutSuccessError
    : timedOut
      ? dict.workspace.billingCheckoutSuccessTimeout
      : dict.workspace.billingCheckoutSuccessNote;

  return (
    <ContentWrapper wrapperClassName='py-8'>
      <div
        className={`
          flex flex-col items-center justify-center gap-4 py-16 text-center
        `}
      >
        <h2 className='text-2xl font-semibold'>
          {dict.workspace.billingCheckoutSuccess}
        </h2>
        <p className='text-muted-foreground'>{statusMessage}</p>
        {showSpinner && (
          <div
            className={`
              mt-4 size-8 animate-spin rounded-full border-4 border-primary
              border-t-transparent
            `}
          />
        )}
      </div>
    </ContentWrapper>
  );
}
