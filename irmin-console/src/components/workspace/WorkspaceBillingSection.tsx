'use client';

import { ContentWrapper } from '@/components/ui/ContentWrapper';
import LoadingSpinner from '@/components/ui/loading/LoadingSpinner';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { useBilling } from '@/hooks/api/useBilling';

import BillingInfoCard from './billing/BillingInfoCard';
import BillingPlanCard from './billing/BillingPlanCard';
import BillingUsageDashboard from './billing/BillingUsageDashboard';

/**
 * Workspace billing settings section.
 * Shows plan info, usage dashboard, and management actions.
 * The parent layout gates access when billing is disabled.
 */
const WorkspaceBillingSection = () => {
  const { dict } = useLocale();
  const { irminAlert } = usePopup();

  const {
    subscriptionQuery,
    subscription,
    usage,
    checkoutMutation,
    portalMutation,
  } = useBilling();

  const isLoading = subscriptionQuery.isPending;
  const isError = subscriptionQuery.isError;

  const handleAddPaymentMethod = () => {
    const returnURL = `${window.location.origin}${window.location.pathname}/success`;
    checkoutMutation.mutate(
      { returnURL },
      {
        onSuccess: (res) => {
          const url = res.data?.checkout_url;
          if (url) {
            window.open(url, '_blank');
          } else {
            irminAlert('error', dict.workspace.billingCheckoutError);
          }
        },
      }
    );
  };

  const handleManageBilling = () => {
    portalMutation.mutate(undefined, {
      onSuccess: (res) => {
        const url = res.data?.portal_url;
        if (url) {
          window.open(url, '_blank');
        } else {
          irminAlert('error', dict.workspace.billingPortalError);
        }
      },
    });
  };

  if (isLoading) {
    return (
      <ContentWrapper wrapperClassName='py-8'>
        <LoadingSpinner />
      </ContentWrapper>
    );
  }

  if (isError) {
    return (
      <ContentWrapper wrapperClassName='py-8'>
        <p className='text-destructive'>{dict.common.error}</p>
      </ContentWrapper>
    );
  }

  return (
    <ContentWrapper wrapperClassName='py-8'>
      <div className='flex flex-col gap-4'>
        <BillingPlanCard
          plan={subscription ?? undefined}
          onAddPaymentMethod={handleAddPaymentMethod}
          onManageBilling={handleManageBilling}
          isCheckoutLoading={checkoutMutation.isPending}
          isPortalLoading={portalMutation.isPending}
        />

        <BillingUsageDashboard
          usage={usage ?? undefined}
          plan={subscription ?? undefined}
        />

        <BillingInfoCard />
      </div>
    </ContentWrapper>
  );
};

export default WorkspaceBillingSection;
