'use client';

import { Button } from '@/components/ui/button';
import { ContentWrapper } from '@/components/ui/ContentWrapper';

import { useLocale } from '@/context/LocaleContext';

/**
 * Workspace billing settings section
 *
 * This component is used to manage workspace's billing settings in the console.
 *
 * @todo Currently Billing is not implemented, thus it only shows a contact us button.
 */
const WorkspaceBillingSection = () => {
  const { dict } = useLocale();

  return (
    <ContentWrapper wrapperClassName='py-8'>
      <h2
        className={`
          mb-8 text-xl
          lg:text-2xl
        `}
      >
        {dict.workspace.billingSettings}
      </h2>
      <p className='mb-8 font-normal text-gray-500'>
        {dict.workspace.billingNote}
      </p>
      <Button href={'/contact'} size='sm' className='w-48'>
        {dict.common.contactUs}
      </Button>
    </ContentWrapper>
  );
};

export default WorkspaceBillingSection;
