import { useState } from 'react';

import ConnectorInfoModal from '@/components/connector/ConnectorInfoModal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';

import type { Connector } from '@/types/core/Connector';

/**
 * Smaller component to display the information of a connector.
 *
 * @param props - The component properties.
 * @param props.connector - The connector to display the information of.
 * @returns The connector information component as a row.
 */
const ConnectorInfoSmall = ({ connector }: { connector: Connector }) => {
  const { dict } = useLocale();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className='flex items-center space-x-4'>
      <Avatar className='size-16 rounded-none'>
        <AvatarImage src={connector.logo_url} alt={connector.name} />
        <AvatarFallback>
          {connector.name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className='flex flex-col gap-1'>
        {connector.primary_category && (
          <Badge variant='default'>{connector.primary_category}</Badge>
        )}
        <div className='flex items-center gap-2'>
          <h2
            className={`
              text-lg
              lg:text-xl
            `}
          >
            {connector.name}
          </h2>
          <Button variant='gray' size='sm' onClick={() => setIsModalOpen(true)}>
            {dict.common.readMore}
          </Button>
        </div>
        <p className='text-sm text-gray-500'>{connector.description}</p>
      </div>
      <ConnectorInfoModal
        connector={connector}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};

export default ConnectorInfoSmall;
