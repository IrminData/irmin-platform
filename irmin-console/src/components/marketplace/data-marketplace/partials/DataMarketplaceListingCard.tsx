import { useState } from 'react';

import { IoClose } from 'react-icons/io5';
import { TbCheck } from 'react-icons/tb';

import Button from '@/components/common/button/Button';

import { useLocale } from '@/context/LocaleContext';

/**
 * Data marketplace listing card
 *
 * @remarks
 *
 * This component is used to display a single repository listing card in the data marketplace.
 * It displays the repository name, source, price, and industry.
 * It also includes a button to connect to the repository.
 *
 * It is used by the DataMarketplaceSection component to display a single repository on the marketplace.
 */
export default function DataMarketplaceListingCard({
  repository,
}: {
  repository: {
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
        <span className='font-medium text-gray-800'>{repository.name}</span>
        {repository.connected ? (
          <span className='text-irmin_green'>
            <TbCheck className='text-2xl' />
          </span>
        ) : null}
      </div>
      <div className='mb-4 text-sm text-gray-600'>
        {dict.marketplace.source}: {repository.source}
      </div>
      <div className='flex items-center justify-between'>
        <span className={`font-lighter text-gray-600`}>
          {repository.price} € {dict.marketplace.pricePostfix}
        </span>
        <div>
          <Button
            variant='link'
            colorScheme='primary'
            size='sm'
            className='mr-4'
            onClick={() => setShowDetails(true)}
            ariaLabel={`View details of ${repository.name}`}
          >
            {dict.marketplace.details}
          </Button>
          {repository.connected ? (
            <span className='inline-block rounded bg-irmin_green px-2 py-1 text-xs font-semibold text-white'>
              {dict.marketplace.connected}
            </span>
          ) : (
            <Button
              variant='solid'
              colorScheme='primary'
              size='sm'
              ariaLabel={`Connect to ${repository.name}`}
              onClick={() => {
                // TODO: Implement connect to repository
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
                {repository.name} - {dict.marketplace.details}
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
              <p className='border-b py-4'>{repository.description ?? ''}</p>
              {/* Details */}
              <div className='flex justify-between'>
                <span className='font-medium'>{dict.marketplace.source}:</span>
                <span>{repository.source}</span>
              </div>
              <div className='flex justify-between'>
                <span className='font-medium'>{dict.marketplace.price}:</span>
                <span>
                  {repository.price} € {dict.marketplace.pricePostfix}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='font-medium'>
                  {dict.marketplace.industry}:
                </span>
                <span>{repository.industry}</span>
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
