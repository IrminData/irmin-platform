import React from 'react';

import {
  IoCheckbox,
  IoClose,
  IoInformationCircleOutline,
} from 'react-icons/io5';

const Alert = ({
  type,
  message,
  onClose,
}: {
  type: 'success' | 'error' | 'info';
  message: string;
  onClose: () => void;
}) => {
  return (
    <div
      id='alert'
      className='absolute bottom-[20px] z-50 flex w-screen animate-slideInUp justify-center p-4 align-middle'
    >
      <div
        className={`flex w-[400px] max-w-[90vw] flex-row items-start justify-between rounded-lg border-2 bg-gray-50 p-4 shadow-md ${
          type === 'success' ? 'border-green-500 text-green-700' : ''
        } ${type === 'error' ? 'border-red-500 text-red-700' : ''} ${
          type === 'info' ? 'border-blue-500 text-blue-700' : ''
        }`}
      >
        <div>
          <div className='flex flex-row pb-4 align-middle'>
            {type === 'success' && <IoCheckbox size={32} />}
            {type === 'error' && <IoClose size={32} />}
            {type === 'info' && <IoInformationCircleOutline size={32} />}
            <h2 className='ml-2 pt-[2px] text-xl font-bold'>
              {type === 'success' && 'Success'}
              {type === 'error' && 'Error'}
              {type === 'info' && 'Info'}
            </h2>
          </div>
          <p className='pb-4 font-medium'>{message}</p>
        </div>
        <button
          className='ml-4 transition-all hover:opacity-50'
          onClick={onClose}
          aria-label='Close alert popup'
        >
          <IoClose size={24} />
        </button>
      </div>
    </div>
  );
};

export default Alert;
