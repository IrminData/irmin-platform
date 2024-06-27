import React from 'react';
import { IoClose } from 'react-icons/io5';

const Modal = ({
  isOpen,
  title,
  children,
  onClose,
}: {
  isOpen: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) => {
  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 flex animate-fadeIn items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm'>
      <div className='relative w-[500px] max-w-[90vw] rounded-lg border-2 border-ash_gray bg-gray-50 p-8 shadow-lg'>
        <div className='mb-4 flex flex-row justify-between'>
          <h2 className='text-2xl font-normal'>{title}</h2>
          <button
            onClick={onClose}
            className='text-2xl leading-none text-gray-700 hover:text-gray-900'
          >
            <IoClose />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default Modal;
