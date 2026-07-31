'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { ContentWrapper } from '@/components/ui/ContentWrapper';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { useBilling } from '@/hooks/api/useBilling';

const MAX_POLL_COUNT = 30;
const MAX_CONSECUTIVE_ERRORS = 3;
const POLL_INTERVAL_MS = 2000;

type PollStatus = 'polling' | 'payment_issue' | 'error' | 'timeout';

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
  const [status, setStatus] = useState<PollStatus>('polling');

  const billingUrl = `/${locale}/workspace/${workspaceSlug}/settings/billing`;

  useEffect(() => {
    // Already active from cached data
    if (
      subscription?.status === 'active' ||
      subscription?.status === 'trialing'
    ) {
      router.replace(billingUrl);
      return;
    }

    if (status !== 'polling') return;

    let cancelled = false;
    let polls = 0;
    let errors = 0;

    const tick = async () => {
      if (cancelled) return;

      try {
        const result = await subscriptionQuery.refetch();
        if (cancelled) return;
        const sub = result.data?.data;

        if (sub?.status === 'active' || sub?.status === 'trialing') {
          router.replace(billingUrl);
          return;
        }
        if (sub?.status === 'past_due' || sub?.status === 'cancelled') {
          setStatus('payment_issue');
          return;
        }
        errors = 0;
      } catch {
        if (cancelled) return;
        errors += 1;
        if (errors >= MAX_CONSECUTIVE_ERRORS) {
          setStatus('error');
          return;
        }
      }

      polls += 1;
      if (polls >= MAX_POLL_COUNT) {
        setStatus('timeout');
        return;
      }

      setTimeout(tick, POLL_INTERVAL_MS);
    };

    const timer = setTimeout(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  const statusMessage =
    status === 'payment_issue'
      ? dict.workspace.billingCheckoutSuccessPaymentIssue
      : status === 'error'
        ? dict.workspace.billingCheckoutSuccessError
        : status === 'timeout'
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
        {status === 'polling' && (
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
