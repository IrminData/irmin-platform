import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className='flex h-screen items-center justify-center'>
      <div className='h-16 w-16 animate-spin rounded-full border-4 border-t-4 border-ash_gray-200 border-t-ash_gray'></div>
    </div>
  );
};

export default LoadingSpinner;
