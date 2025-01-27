import type { JSX } from 'react';

import {
  IoCheckbox,
  IoClose,
  IoInformationCircleOutline,
} from 'react-icons/io5';

import { ButtonWithTooltip } from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';

/**
 * Alert UI component
 *
 * @remarks
 *
 * UI for displaying alerts in a popup.
 *
 * It displays a message with an icon and a close button.
 *
 * This popup is shown when the user needs to be notified about something.
 * The position of the popup is fixed at the bottom of the screen.
 *
 * @param alertDetails - The details of the alert popup
 * @param alertDetails.type - The type of the alert popup
 * @param alertDetails.message - The message to display in the alert popup, can be a string or JSX element
 * @param alertDetails.onClose - The function to call when the user closes the alert
 *
 * @returns The alert popup component
 */
const Alert = ({
  type,
  message,
  onClose,
}: {
  type: 'success' | 'error' | 'info';
  message: string | JSX.Element;
  onClose: () => void;
}) => {
  const { dict } = useLocale();
  const successTitle = dict.common.success;
  const errorTitle = dict.common.error;
  const infoTitle = dict.common.info;
  return (
    <div
      id='alert'
      className='animate-slideInUp fixed bottom-[20px] z-50 flex w-screen justify-center p-4 align-middle'
    >
      <div
        className={`bg-popover flex w-[400px] max-w-[90vw] flex-row items-start justify-between rounded-lg border p-4 shadow-md ${
          type === 'success' ? 'border-accent' : ''
        } ${type === 'error' ? 'border-destructive' : ''} ${
          type === 'info' ? 'border-blue-500' : ''
        }`}
      >
        <div className='flex flex-col gap-4'>
          <div className='flex flex-row items-center gap-2'>
            {type === 'success' && (
              <IoCheckbox size={32} className='text-irmin_green' />
            )}
            {type === 'error' && (
              <IoClose size={32} className='text-destructive' />
            )}
            {type === 'info' && (
              <IoInformationCircleOutline size={32} className='text-blue-500' />
            )}
            <h2 className='text-base font-medium'>
              {type === 'success' && successTitle}
              {type === 'error' && errorTitle}
              {type === 'info' && infoTitle}
            </h2>
          </div>
          <p className='pb-4 text-base font-normal'>{message}</p>
        </div>
        <ButtonWithTooltip
          size='icon'
          variant='ghost'
          className='ml-4 rounded-full'
          onClick={onClose}
          aria-label={dict.common.close}
          tooltip={dict.common.close}
          icon={<IoClose size={24} />}
        />
      </div>
    </div>
  );
};

export default Alert;
