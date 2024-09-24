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
 *
 * @param modalDetails - The details of the modal
 * @param modalDetails.isOpen - Whether the modal is open
 * @param modalDetails.title - The title of the modal
 * @param modalDetails.children - The content of the modal
 * @param modalDetails.onClose - The function to call when the user closes the modal
 *
 * @returns The modal component
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
    <div
      id='irmin-modal'
      className='fixed inset-0 z-50 flex animate-fadeIn items-center justify-center bg-gray-200 bg-opacity-30 backdrop-blur-[2px] dark:bg-irmin_black dark:bg-opacity-30'
    >
      <div className='w-[500px] max-w-[90vw] pt-[40px]'>
        <div className='rounded-lg border border-irmin_green bg-gray-50 shadow-lg dark:bg-irmin_black'>
          <div className='align-center flex flex-row justify-between border-b px-4 pb-4 pt-4 dark:border-b-gray-800'>
            <h2 className='text-lg font-normal'>{title}</h2>
            <button
              className='ml-4 transition-all hover:opacity-50'
              onClick={onClose}
              aria-label='Close modal'
            >
              <IoClose size={24} />
            </button>
          </div>
          <div className='relative max-h-[calc(100vh-150px)] overflow-scroll px-4 pt-4'>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
