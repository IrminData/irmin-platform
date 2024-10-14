'use client';

import Button from '@/components/ui/button';

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
    <div className='my-8 px-4' id='workspace-billing-settings-section'>
      <div className='container relative mx-auto my-8 max-w-6xl'>
        <div className='shadow-md-600 w-full max-w-3xl rounded-lg border-b border-t border-accent bg-background px-4 py-4 md:mx-4'>
          <div className='my-8 px-4'>
            <h2 className='mb-8 text-lg font-semibold lg:text-xl'>
              {dict.workspace.billingSettings}
            </h2>
            <p className='mb-8 font-normal text-gray-500'>
              {dict.workspace.billingNote}
            </p>
            <Button href={'/contact'} size='sm' className='w-48'>
              {dict.workspace.contactUs}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceBillingSection;
