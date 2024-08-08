import React, { useEffect, useState } from 'react';

import { IoAdd, IoClose } from 'react-icons/io5';

import Button from '@/components/common/button/Button';

/**
 * Side modal UI component with steps
 *
 * @remarks
 *
 * This modal is used for example when creating a Connection Workflow.
 * It has a title, steps, content and a close button.
 *
 * The position of the modal is fixed on the right side of the screen.
 * The modal has a slide-in and slide-out animation.
 */
export default function SideModal({
  setIsOpen,
  isOpen,
  steps,
  currentStep,
  children,
  title,
}: {
  setIsOpen: (_isOpen: boolean) => void;
  isOpen: boolean;
  steps: string[];
  currentStep: number;
  children: React.ReactNode;
  title: string;
}) {
  const [isRealOpen, setIsRealOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsRealOpen(true);
      setIsAnimating(true);
    }
    if (!isOpen) {
      setIsAnimating(false);
      setTimeout(() => {
        setIsRealOpen(false);
      }, 500); // Match this duration with your animation duration
    }
  }, [isOpen]);

  return (
    <>
      <button
        className='group absolute right-2 top-8 flex cursor-pointer items-center justify-center transition-all lg:right-5 lg:top-6'
        onClick={() => setIsOpen(true)}
        aria-label={title}
      >
        <p className='-mr-4 flex items-center justify-center rounded-l-full py-2 pl-2 pr-6 text-xs text-gray-500 opacity-0 shadow transition-all group-hover:opacity-100'>
          {title}
        </p>
        <p className='flex h-12 w-12 items-center justify-center rounded-full bg-irmin_green text-white transition-all group-hover:bg-irmin_green-600'>
          <IoAdd size={30} />
        </p>
      </button>
      {(isRealOpen || isAnimating) && (
        <div className='fixed inset-0 z-50 flex items-center justify-center'>
          <div className='relative h-full w-full'>
            <div
              className={`absolute bottom-0 right-0 top-0 h-full w-full bg-white shadow-lg transition-transform duration-200 md:w-3/4 lg:w-1/2 xl:w-2/5 ${
                isRealOpen && isAnimating
                  ? 'animate-slideIn'
                  : 'animate-slideOut'
              }`}
            >
              <div className='flex h-full flex-col justify-start'>
                <div className='z-10 flex w-full justify-end pr-4 pt-[44px]'>
                  <Button
                    variant='icon'
                    colorScheme='primary'
                    onClick={() => setIsOpen(false)}
                    ariaLabel='Close modal'
                  >
                    <IoClose size={30} />
                  </Button>
                </div>
                <div className='flex h-14 items-center justify-between border-b px-6 py-4'>
                  <h3 className='text-xl font-semibold'>{title}</h3>
                </div>
                <div className='flex items-center justify-between space-x-4 px-6 py-4'>
                  {steps.map((step, index) => (
                    <div
                      className={`flex flex-col items-center lg:flex-row ${
                        index === steps.length - 1 ? '' : 'mr-0'
                      }`}
                      key={step}
                    >
                      <div
                        className={`lg-4 mr-2 flex h-6 w-6 items-center justify-center rounded-full text-sm text-white lg:mb-0 ${
                          currentStep >= index + 1
                            ? 'bg-irmin_green-500'
                            : 'bg-gray-300'
                        }`}
                      >
                        {index + 1}
                      </div>
                      <span
                        className={`text-xs ${
                          currentStep >= index + 1
                            ? 'text-irmin_green-500'
                            : 'text-gray-500'
                        }`}
                      >
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
                <hr className='border-t shadow-sm' />
                <div className='grow overflow-y-scroll pb-12 pt-0 lg:pt-[38px]'>
                  {children}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
