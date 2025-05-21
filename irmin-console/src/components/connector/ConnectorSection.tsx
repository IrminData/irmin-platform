'use client';

import { useRouter } from 'next/navigation';

import { TbChevronLeft } from 'react-icons/tb';

import Button from '@/components/ui/button';
import ContentWrapper from '@/components/ui/ContentWrapper';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useConnector } from '@/hooks/useConnector';

import { ConnectorInfo } from './ConnectorInfo';

/**
 * Connector information section
 *
 * @param props - The props for the component
 * @param props.connectorID - The connector's identifier
 */
const ConnectorSection = ({ connectorID }: { connectorID: string }) => {
  const router = useRouter();
  const { connectorQuery } = useConnector(connectorID);

  return (
    <div className='relative container mx-auto max-w-7xl'>
      <div className='flex flex-col px-2 py-12 md:px-4'>
        <Button
          size='icon'
          variant='gray'
          className='rounded-full'
          icon={<TbChevronLeft size={24} />}
          onClick={() => router.back()}
        />
        <ContentWrapper>
          {connectorQuery.isLoading && (
            <LoadingSkeleton className='h-80 w-full' />
          )}
          {connectorQuery.data?.data && (
            <ConnectorInfo connector={connectorQuery.data.data} />
          )}
        </ContentWrapper>
      </div>
    </div>
  );
};

export default ConnectorSection;
