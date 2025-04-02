'use client';

import { TbMail } from 'react-icons/tb';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

import { useLocale } from '@/context/LocaleContext';

import { Connector } from '@/types/core/Connector';

interface ConnectorInfoProps {
  connector: Connector;
}

/**
 * Component to display the information of a connector.
 *
 * @param props - The component properties.
 * @param props.connector - The connector to display the information of.
 * @returns The connector information component.
 */
export function ConnectorInfo({ connector }: ConnectorInfoProps) {
  const { dict } = useLocale();

  return (
    <div className='flex flex-col space-y-4 p-6'>
      <div className='mb-4 flex items-center space-x-4'>
        <Avatar className='h-16 w-16 rounded-none'>
          <AvatarImage src={connector.logo_url} alt={connector.name} />
          <AvatarFallback>
            {connector.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h2 className='text-xl lg:text-2xl'>{connector.name}</h2>
          <p className='text-sm text-gray-500'>{connector.description}</p>
        </div>
      </div>

      <Separator />

      <div className='grid gap-4 text-sm'>
        <div className='flex items-center justify-between'>
          <span className='font-semibold'>{dict.connectors.version}:</span>
          <span>{connector.version}</span>
        </div>
        <div className='flex items-center justify-between'>
          <span className='font-semibold'>
            {dict.connectors.structureVersion}:
          </span>
          <span>{connector.structure_version}</span>
        </div>
        <div className='flex items-center justify-between'>
          <span className='font-semibold'>{dict.connectors.author}:</span>
          <span>{connector.author}</span>
        </div>
        {connector.author_email && (
          <div className='flex items-center justify-between'>
            <span className='font-semibold'>
              {dict.connectors.authorEmail}:
            </span>
            <a
              href={`mailto:${connector.author_email}`}
              className='flex items-center hover:underline'
            >
              <TbMail className='mr-1 h-4 w-4' />
              {connector.author_email}
            </a>
          </div>
        )}
      </div>

      <Separator />

      <div>
        <h3 className='mb-2 font-semibold'>{dict.connectors.categories}:</h3>
        <div className='flex flex-wrap gap-2'>
          {connector.primary_category && (
            <Badge key={connector.primary_category} variant={'primary'}>
              {connector.primary_category.replace('_', ' ')}
            </Badge>
          )}
          {connector.categories
            ?.filter((category) => category !== connector.primary_category)
            .map((category) => (
              <Badge key={category} variant={'secondary'}>
                {category.replace('_', ' ')}
              </Badge>
            ))}
        </div>
      </div>

      <div>
        <h3 className='mb-2 font-semibold'>{dict.connectors.capabilities}:</h3>
        <div className='flex flex-wrap gap-2'>
          {connector.capabilities.map((capability) => (
            <Badge key={capability} variant='primary'>
              {capability}
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <h3 className='mb-2 font-semibold'>{dict.connectors.locales}:</h3>
        <div className='flex flex-wrap gap-2'>
          {connector.locales.map((locale) => (
            <Badge key={locale} variant='primary'>
              {locale}
            </Badge>
          ))}
        </div>
      </div>

      {connector.read_more_url && (
        <div className='mt-4'>
          <Button
            href={connector.read_more_url}
            target='_blank'
            rel='noopener noreferrer'
            className='w-full'
            variant='gray'
          >
            {dict.common.readMore}
          </Button>
        </div>
      )}
    </div>
  );
}
