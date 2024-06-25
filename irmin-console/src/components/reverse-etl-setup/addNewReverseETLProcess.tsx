'use client';
import { useState } from 'react';
import { IoAdd, IoClose } from 'react-icons/io5';
import ReverseETLSetupView from '@/components/reverse-etl-setup/reverseETLSetupView';

export default function AddNewReverseETLProcess() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <div className='fixed right-10 top-28 z-10'>
        <button
          className='flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-ash_gray text-white transition-all hover:opacity-50'
          onClick={() => setIsOpen(true)}
        >
          <IoAdd size={30} />
        </button>
      </div>
      {isOpen && (
        <div
          className='fixed left-0 top-0 z-50 h-screen w-screen'
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          }}
        >
          <div className='relative h-full w-full'>
            <div className='absolute right-10 top-28 z-10'>
              <button
                className='flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-ash_gray text-white transition-all hover:opacity-50'
                onClick={() => setIsOpen(false)}
              >
                <IoClose size={30} />
              </button>
            </div>
            <div className='absolute right-0 top-0 h-full w-2/5 bg-white'>
              <ReverseETLSetupView setIsOpen={setIsOpen} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
