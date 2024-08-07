'use client';

import { IoClose } from 'react-icons/io5';

import Button from '@/components/common/button/Button';

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
        className={`flex w-[400px] max-w-[90vw] flex-col items-start justify-between rounded-lg border-2 bg-gray-50 p-4 shadow-md ${type === 'warning' ? 'border-red-500 text-red-700' : ''} ${
          type === 'info' ? 'border-irmin_blue text-irmin_blue' : ''
        }`}
      >
        <div className='flex flex-row items-start justify-between'>
          <div className='flex-1'>
            <p className='pb-4 text-sm'>{message}</p>
          </div>
          <button
            className='ml-4 text-irmin_black transition-all hover:opacity-50'
            onClick={() => onSelect(false)}
            aria-label='Close confirmation popup'
          >
            <IoClose size={24} />
          </button>
        </div>
        <div className='mt-4 flex w-full justify-end gap-2'>
          <Button
            variant='outline'
            colorScheme='gray'
            onClick={() => onSelect(false)}
            ariaLabel='Cancel confirmation'
            size='sm'
            className='w-1/2'
          >
            {dict.misc.cancel}
          </Button>
          <Button
            variant='solid'
            colorScheme={type === 'warning' ? 'secondary' : 'tertiary'}
            onClick={() => onSelect(true)}
            ariaLabel='Confirm'
            size='sm'
            className='w-1/2'
          >
            {dict.misc.confirm}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Confirm;
