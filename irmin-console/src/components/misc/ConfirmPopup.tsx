import React from 'react';
import {
  IoCheckbox,
  IoClose,
  IoInformationCircleOutline,
} from 'react-icons/io5';

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
      className={`fixed top-[94px] z-20 flex w-screen justify-center p-4 align-middle`}
    >
      <div
        className={`flex max-w-md flex-col items-start justify-between rounded-lg border-2 bg-ash_gray-900 p-4 shadow-md ${
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
            onClick={onCancel}
            className='ml-4 text-2xl leading-none text-gray-700 hover:text-gray-900'
          >
            <IoClose />
          </button>
        </div>
        <div className='mt-4 flex justify-end space-x-4'>
          <button
            onClick={onCancel}
            className='rounded bg-gray-300 px-4 py-2 text-gray-700 transition-all hover:bg-gray-400'
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`rounded px-4 py-2 text-white transition-all ${
              type === 'success' ? 'bg-green-700 hover:bg-ash_gray' : ''
            } ${type === 'error' ? 'bg-red-500 hover:bg-red-600' : ''} ${
              type === 'info' ? 'bg-blue-500 hover:bg-blue-600' : ''
            }`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmPopup;
