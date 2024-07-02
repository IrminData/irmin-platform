import React, { useState } from 'react';

import { IoClose } from 'react-icons/io5';
import { TbCheck } from 'react-icons/tb';

import { MarketplacePlugin } from '@/components/marketplace/pluginMarketplace';
import Button from '@/components/misc/Button';

const PluginMarketplaceListingCard: React.FC<{ plugin: MarketplacePlugin }> = ({
  plugin,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className='rounded-lg border bg-white p-4 shadow transition duration-300 hover:shadow-lg'>
      <div className='mb-2 flex items-center justify-between'>
        <span className='font-medium text-gray-800'>{plugin.name}</span>
        {plugin.connected ? (
          <span className='text-irmin_green'>
            <TbCheck className='text-2xl' />
          </span>
        ) : null}
      </div>
      <div className='mb-4 text-sm text-gray-600'>
        Provider: {plugin.provider}
      </div>
      <div className='flex items-center justify-between'>
        <span className={`font-lighter text-gray-600`}>{plugin.price} €</span>
        <div>
          <Button
            variant='link'
            colorScheme='primary'
            size='sm'
            className='mr-4'
            onClick={() => setShowDetails(true)}
            ariaLabel={`View details of ${plugin.name}`}
          >
            Details
          </Button>
          {plugin.connected ? (
            <span className='inline-block rounded bg-irmin_green px-2 py-1 text-xs font-semibold text-white'>
              Connected
            </span>
          ) : (
            <Button
              variant='solid'
              colorScheme='primary'
              size='sm'
              ariaLabel={`Connect to ${plugin.name}`}
              onClick={() => {
                /* TODO: function to handle connect */
                console.log('Connect to', plugin.name);
              }}
            >
              Connect
            </Button>
          )}
        </div>
      </div>

      {showDetails && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-gray-800 bg-opacity-50 p-20'>
          <div className='w-full rounded bg-white p-6 shadow-lg md:w-3/4 lg:w-1/2'>
            <div className='mb-4 flex items-center justify-between border-b pb-3'>
              <h2 className='text-xl font-semibold'>{plugin.name} - Details</h2>
              <Button
                variant='icon'
                colorScheme='black'
                onClick={() => setShowDetails(false)}
                ariaLabel='Close details popup'
              >
                <IoClose />
              </Button>
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
              <Button
                variant='solid'
                colorScheme='primary'
                onClick={() => setShowDetails(false)}
                ariaLabel='Close details popup'
              >
                Close the details popup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PluginMarketplaceListingCard;
