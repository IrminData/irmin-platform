import React from 'react';

/**
 * Loading spinner component
 */
const LoadingSpinner = () => {
  return (
    <div className='flex h-full max-h-screen items-center justify-center py-16'>
      <div
        className={`
          size-16 animate-spin rounded-full border-4 border-t-4 border-accent/20
          border-t-irmin-green-500
        `}
      />
    </div>
  );
};

export default LoadingSpinner;
