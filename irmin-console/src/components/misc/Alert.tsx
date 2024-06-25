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
      className={`fixed top-[94px] z-20 flex w-screen justify-center p-4 align-middle`}
    >
      <div
        className={`flex max-w-md flex-row items-start justify-between rounded-lg border-2 bg-ash_gray-900 p-4 shadow-md ${type === 'success' ? 'border-green-500 text-green-700' : ''} ${type === 'error' ? 'border-red-500 text-red-700' : ''} ${type === 'info' ? 'border-blue-500 text-blue-700' : ''} `}
      >
        <div>
          <div className='flex flex-row pb-4 align-middle'>
            {type === 'success' && <IoCheckbox size={32} />}
            {type === 'error' && <IoClose size={32} />}
            {type === 'info' && <IoInformationCircleOutline size={32} />}
            <h2 className='ml-2 pt-[2px] text-xl font-bold'>
              {type === 'success' && 'Success'}
              {type === 'error' && 'Error'}
            </h2>
          </div>
          <p className='pb-4 font-medium'>{message}</p>
        </div>
        <button
          onClick={onClose}
          className='ml-4 align-top text-2xl leading-none text-gray-700 hover:text-gray-900'
        >
          <IoClose />
        </button>
      </div>
    </div>
  );
};

export default Alert;
