import React, { useState } from 'react';

import { IoClose } from 'react-icons/io5';
import { TbCheck } from 'react-icons/tb';

import Button from '@/components/misc/Button';

import { useLocale } from '@/context/LocaleContext';

/**
 * Data marketplace listing card
 *
 * @remarks
 *
 * This component is used to display a single dataset listing card in the data marketplace.
 * It displays the dataset name, source, price, and industry.
 * It also includes a button to connect to the dataset.
 *
 * It is used by the DataMarketplace component to display a single dataset on the marketplace.
 */
export default function DataMarketplaceListingCard({
  dataset,
}: {
  dataset: {
    id: number;
    name: string;
    source: string;
    price: number;
    connected: boolean;
    industry: string;
    description: string;
  };
}) {
  const { dict } = useLocale();
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className='rounded-lg border bg-white p-4 shadow transition duration-300 hover:shadow-lg'>
      <div className='mb-2 flex items-center justify-between'>
        <span className='font-medium text-gray-800'>{dataset.name}</span>
        {dataset.connected ? (
          <span className='text-irmin_green'>
            <TbCheck className='text-2xl' />
          </span>
        ) : null}
      </div>
      <div className='mb-4 text-sm text-gray-600'>
        {dict.marketplace.source}: {dataset.source}
      </div>
      <div className='flex items-center justify-between'>
        <span className={`font-lighter text-gray-600`}>
          {dataset.price} € {dict.marketplace.pricePostfix}
        </span>
        <div>
          <Button
            variant='link'
            colorScheme='primary'
            size='sm'
            className='mr-4'
            onClick={() => setShowDetails(true)}
            ariaLabel={`View details of ${dataset.name}`}
          >
            {dict.marketplace.details}
          </Button>
          {dataset.connected ? (
            <span className='inline-block rounded bg-irmin_green px-2 py-1 text-xs font-semibold text-white'>
              {dict.marketplace.connected}
            </span>
          ) : (
            <Button
              variant='solid'
              colorScheme='primary'
              size='sm'
              ariaLabel={`Connect to ${dataset.name}`}
              onClick={() => {
                // TODO: Implement connect to dataset
              }}
            >
              {dict.marketplace.connect}
            </Button>
          )}
        </div>
      </div>

      {showDetails && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-gray-800 bg-opacity-50 p-20'>
          <div className='w-full rounded bg-white p-6 shadow-lg md:w-3/4 lg:w-1/2'>
            <div className='mb-4 flex items-center justify-between border-b pb-3'>
              <h2 className='text-xl font-semibold'>
                {dataset.name} - {dict.marketplace.details}
              </h2>
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
              <p className='border-b py-4'>{dataset.description ?? ''}</p>
              {/* Details */}
              <div className='flex justify-between'>
                <span className='font-medium'>{dict.marketplace.source}:</span>
                <span>{dataset.source}</span>
              </div>
              <div className='flex justify-between'>
                <span className='font-medium'>{dict.marketplace.price}:</span>
                <span>
                  {dataset.price} € {dict.marketplace.pricePostfix}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='font-medium'>
                  {dict.marketplace.industry}:
                </span>
                <span>{dataset.industry}</span>
              </div>
            </div>
            <div className='mt-4 flex justify-end'>
              <Button
                variant='solid'
                colorScheme='primary'
                onClick={() => setShowDetails(false)}
                ariaLabel='Close details popup'
              >
                <IoClose />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
