import React from 'react';

const LoadingSkeleton = ({
  width,
  height,
}: {
  width: string;
  height: string;
}) => {
  return (
    <div className='animate-pulse bg-gray-200' style={{ width, height }}></div>
  );
};

export default LoadingSkeleton;
