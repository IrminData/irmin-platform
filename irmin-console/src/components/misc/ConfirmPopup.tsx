import React from 'react';

import { IoClose } from 'react-icons/io5';

import Button from '@/components/misc/Button';

const ConfirmPopup = ({
  type,
  message,
  onConfirm,
  onCancel,
}: {
  type: 'success' | 'error' | 'info';
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  return (
    <div
      id='confirm'
      className='absolute bottom-[20px] z-50 flex w-screen animate-slideInUp justify-center p-4 align-middle'
    >
      <div
        className={`flex w-[400px] max-w-[90vw] flex-col items-start justify-between rounded-lg border-2 bg-gray-50 p-4 shadow-md ${
          type === 'success' ? 'border-green-500 text-green-700' : ''
        } ${type === 'error' ? 'border-red-500 text-red-700' : ''} ${
          type === 'info' ? 'border-blue-500 text-blue-700' : ''
        }`}
      >
        <div className='flex flex-row items-start justify-between'>
          <div className='flex-1'>
            <p className='pb-4 font-medium'>{message}</p>
          </div>
          <button
            className='ml-4 transition-all hover:opacity-50'
            onClick={onCancel}
            aria-label='Close confirmation popup'
          >
            <IoClose size={24} />
          </button>
        </div>
        <div className='mt-4 flex justify-end gap-2'>
          <Button
            variant='outline'
            colorScheme='gray'
            onClick={onCancel}
            ariaLabel='Cancel confirmation'
            size='sm'
            className='w-1/2'
          >
            Cancel
          </Button>
          <Button
            variant='solid'
            colorScheme={
              type === 'success'
                ? 'primary'
                : type === 'error'
                  ? 'secondary'
                  : 'tertiary'
            }
            onClick={onConfirm}
            ariaLabel='Confirm'
            size='sm'
            className='w-1/2'
          >
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmPopup;
