import React from 'react';

/**
 * Loading spinner component
 */
const LoadingSpinner: React.FC = () => {
  return (
    <div className='flex h-full max-h-screen items-center justify-center py-16'>
      <div className='border-accent-200 h-16 w-16 animate-spin rounded-full border-4 border-t-4 border-t-irmin_green'></div>
    </div>
  );
};

export default LoadingSpinner;
