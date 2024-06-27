import React, { useState, useEffect } from 'react';
import { IoAdd, IoClose } from 'react-icons/io5';

export default function SideModal({
  setIsOpen,
  isOpen,
  steps,
  currentStep,
  children,
  title,
}: {
  setIsOpen: (isOpen: boolean) => void;
  isOpen: boolean;
  steps: string[];
  currentStep: number;
  children: React.ReactNode;
  title: string;
}) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsOpen(false);
    }, 500); // Match this duration with your animation duration
  };

  return (
    <>
      <div className='fixed right-10 top-28 z-10'>
        <button
          className='flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-ash_gray text-white transition-all hover:bg-ash_gray-600'
          onClick={() => setIsOpen(true)}
        >
          <IoAdd size={30} />
        </button>
      </div>
      {(isOpen || isAnimating) && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'>
          <div className='relative h-full w-full'>
            <div
              className={`absolute right-0 top-0 h-full w-full bg-white transition-transform duration-200 md:w-3/4 lg:w-1/2 xl:w-2/5 ${
                isOpen && isAnimating ? 'animate-slideIn' : 'animate-slideOut'
              }`}
            >
              <div className='z-10 flex w-full justify-end pr-4 pt-[44px]'>
                <button
                  className='flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-ash_gray text-white transition-all hover:bg-ash_gray-600'
                  onClick={handleClose}
                >
                  <IoClose size={30} />
                </button>
              </div>
              <div className='max-h-screen overflow-y-scroll pt-[38px]'>
                <div className='flex h-14 items-center justify-between border-b px-6 py-4'>
                  <h3 className='text-xl font-semibold'>{title}</h3>
                </div>
                <div className='flex items-center space-x-4 px-6 py-4'>
                  {steps.map((step, index) => (
                    <div
                      className={`flex items-center ${
                        index === steps.length - 1 ? '' : 'mr-0'
                      }`}
                      key={step}
                    >
                      <div
                        className={`mr-2 flex h-6 w-6 items-center justify-center rounded-full text-sm text-white ${
                          currentStep >= index + 1
                            ? 'bg-ash_gray-500'
                            : 'bg-gray-300'
                        }`}
                      >
                        {index + 1}
                      </div>
                      <span
                        className={`text-xs ${
                          currentStep >= index + 1
                            ? 'text-ash_gray-500'
                            : 'text-gray-500'
                        }`}
                      >
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
                {children}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
