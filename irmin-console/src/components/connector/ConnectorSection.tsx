'use client';

import { useRouter } from 'next/navigation';

import { IoChevronBack } from 'react-icons/io5';

import Button from '@/components/ui/button';
import ContentWrapper from '@/components/ui/ContentWrapper';

import { Connector } from '@/types/core/Connector';

import { ConnectorInfo } from './ConnectorInfo';

/**
 * Connector information section
 *
 * @param props - The props for the component
 * @param props.connector - The connector object
 */
const ConnectorSection = ({ connector }: { connector: Connector }) => {
  const router = useRouter();

  return (
    <div className='relative container mx-auto max-w-6xl'>
      <div className='flex flex-col px-2 py-12 md:px-4'>
        <Button
          size='icon'
          variant='gray'
          className='rounded-full'
          icon={<IoChevronBack size={24} />}
          onClick={() => router.back()}
        />
        <ContentWrapper>
          <ConnectorInfo connector={connector} />
        </ContentWrapper>
      </div>
    </div>
  );
};

export default ConnectorSection;
