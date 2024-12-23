'use client';

import { IoClose } from 'react-icons/io5';

import Button, { ButtonWithTooltip } from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';

/**
 * Confirmation popup UI
 *
 * @remarks
 *
 * UI for displaying a confirmation popup with a message and two buttons
 * to confirm or cancel the action.
 *
 * This popup is shown when the user needs to confirm an action.
 * The position of the popup is fixed at the bottom of the screen.
 *
 * @param confirmPopupDetails - The details of the confirmation popup
 * @param confirmPopupDetails.type - The type of the confirmation popup
 * @param confirmPopupDetails.message - The message to display in the confirmation popup
 * @param confirmPopupDetails.onSelect - The function to call when the user selects an option
 *
 * @returns The confirmation popup component
 */
const Confirm = ({
  type,
  message,
  onSelect,
}: {
  type: 'warning' | 'info';
  message: string;
  onSelect: (_confirmed: boolean) => void;
}) => {
  const { dict } = useLocale();
  return (
    <div
      id='confirm'
      className='fixed bottom-[20px] z-50 flex w-screen animate-slideInUp justify-center p-4 align-middle'
    >
      <div
        className={`flex w-[400px] max-w-[90vw] flex-col items-start justify-between rounded-lg border bg-gray-50 p-4 shadow-md dark:bg-irmin_black ${type === 'warning' ? 'border-destructive' : ''} ${
          type === 'info' ? 'border-irmin_blue' : ''
        }`}
      >
        <div className='flex w-full flex-row items-center justify-between'>
          <p className='text-base font-normal'>{message}</p>
          <ButtonWithTooltip
            size='icon'
            variant='ghost'
            onClick={() => onSelect(false)}
            aria-label='Close confirmation popup'
            tooltip={dict.common.close}
            icon={<IoClose size={22} />}
          />
        </div>
        <div className='mt-8 flex w-full justify-end gap-2'>
          <Button
            variant='secondary'
            onClick={() => onSelect(false)}
            aria-label='Cancel confirmation'
            size='sm'
            className='w-1/2'
          >
            {dict.common.cancel}
          </Button>
          <Button
            variant={type === 'warning' ? 'destructive' : 'default'}
            onClick={() => onSelect(true)}
            aria-label='Confirm'
            size='sm'
            className='w-1/2'
          >
            {dict.common.confirm}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Confirm;
