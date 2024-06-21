import React, { useState } from 'react';
import { IoClose } from 'react-icons/io5';
import { TbCheck } from 'react-icons/tb';

const PluginMarketplaceListingCard: React.FC<{ plugin: any }> = ({
  plugin,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className='rounded border p-4 shadow transition duration-300 hover:shadow-lg'>
      <div className='mb-2 flex items-center justify-between'>
        <span className='font-medium text-gray-800'>{plugin.name}</span>
        {plugin.connected ? (
          <span className='text-ash_gray'>
            <TbCheck className='text-2xl' />
          </span>
        ) : null}
      </div>
      <div className='mb-4 text-sm text-gray-600'>
        Provider: {plugin.provider}
      </div>
      <div className='flex items-center justify-between'>
        <span className={`font-lighter text-gray-600`}>${plugin.price}</span>
        <div>
          <button
            className='mr-4 rounded text-ash_gray hover:text-ash_gray-700'
            onClick={() => setShowDetails(true)}
          >
            Details
          </button>
          {plugin.connected ? (
            <span className='inline-block rounded bg-ash_gray px-2 py-1 text-xs font-semibold text-white'>
              Connected
            </span>
          ) : (
            <button
              className='rounded bg-ash_gray px-4 py-2 text-white hover:bg-ash_gray-700'
              onClick={() => {
                /* function to handle connect */
              }}
            >
              Connect
            </button>
          )}
        </div>
      </div>

      {showDetails && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-gray-800 bg-opacity-50 p-20'>
          <div className='w-full rounded bg-white p-6 shadow-lg md:w-3/4 lg:w-1/2'>
            <div className='mb-4 flex items-center justify-between border-b pb-3'>
              <h2 className='text-xl font-semibold'>{plugin.name} - Details</h2>
              <button
                className='text-gray-800 hover:text-gray-600'
                onClick={() => setShowDetails(false)}
              >
                <IoClose />
              </button>
            </div>
            <div className='flex flex-col space-y-2'>
              {/* Description */}
              <p className='border-b py-4'>{plugin.description ?? ''}</p>
              {/* Details */}
              <div className='flex justify-between'>
                <span className='font-medium'>Provider:</span>
                <span>{plugin.provider}</span>
              </div>
              <div className='flex justify-between'>
                <span className='font-medium'>Price:</span>
                <span>${plugin.price}</span>
              </div>
              <div className='flex justify-between'>
                <span className='font-medium'>Category:</span>
                <span>{plugin.category}</span>
              </div>
            </div>
            <div className='mt-4 flex justify-end'>
              <button
                className='rounded bg-ash_gray px-4 py-2 text-white hover:bg-ash_gray-600'
                onClick={() => setShowDetails(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PluginMarketplaceListingCard;
