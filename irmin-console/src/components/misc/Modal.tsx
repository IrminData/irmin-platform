import React from 'react';

import { IoClose } from 'react-icons/io5';

/**
 * Modal UI component
 *
 * @remarks
 *
 * UI for displaying a modal with a title and content.
 *
 * This modal is shown when the user needs to interact with a form or a message.
 * The position of the modal is fixed in the center of the screen.
 */
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
      <div className='relative w-[500px] max-w-[90vw] rounded-lg border-2 border-irmin_green bg-gray-50 p-8 shadow-lg'>
        <div className='align-center mb-4 flex flex-row justify-between'>
          <h2 className='text-lg font-normal'>{title}</h2>
          <button
            className='ml-4 transition-all hover:opacity-50'
            onClick={onClose}
            aria-label='Close modal'
          >
            <IoClose size={24} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default Modal;
