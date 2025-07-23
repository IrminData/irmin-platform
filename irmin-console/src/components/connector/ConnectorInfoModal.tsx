'use client';

import { IoClose } from 'react-icons/io5';
import { TbMail } from 'react-icons/tb';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ButtonWithTooltip } from '@/components/ui/button-with-tooltip';
import { Separator } from '@/components/ui/separator';

import { useLocale } from '@/context/LocaleContext';

import type { Connector } from '@/types/core/Connector';

interface ConnectorInfoModalProps {
  connector: Connector;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal component to display detailed connector information
 */
function ConnectorInfoModal({
  connector,
  isOpen,
  onClose,
}: ConnectorInfoModalProps) {
  const { dict } = useLocale();

  if (!isOpen) return null;

  return (
    <div
      className={`
        fixed inset-0 z-50 flex items-center justify-center backdrop-blur-xs
      `}
    >
      <div
        className='absolute inset-0 bg-black/20'
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            onClose();
          }
        }}
        role='button'
        tabIndex={0}
        aria-label='Close modal'
      />
      <div
        className={`
          relative mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg
          border bg-background shadow-lg
        `}
      >
        {/* Header */}
        <div
          className={`
            sticky top-0 z-10 flex items-center justify-between border-b
            bg-background p-6
          `}
        >
          <h2 className='text-xl font-semibold'>{dict.connectors.connector}</h2>
          <ButtonWithTooltip
            size='icon'
            variant='ghost'
            className='rounded-full'
            onClick={onClose}
            aria-label='Close modal'
            tooltip='Close modal'
            icon={<IoClose size={20} />}
          />
        </div>

        {/* Content */}
        <div className='flex flex-col space-y-4 p-6'>
          {/* Connector Header */}
          <div className='mb-4 flex items-center space-x-4'>
            <Avatar className='size-16 rounded-none'>
              <AvatarImage src={connector.logo_url} alt={connector.name} />
              <AvatarFallback>
                {connector.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3
                className={`
                  text-xl
                  lg:text-2xl
                `}
              >
                {connector.name}
              </h3>
              <p className='text-sm text-gray-500'>{connector.description}</p>
            </div>
          </div>

          <Separator />

          {/* Connector Details */}
          <div className='grid gap-4 text-sm'>
            <div className='flex items-center justify-between'>
              <span className='font-semibold'>{dict.connectors.version}:</span>
              <span>{connector.version}</span>
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
                  className={`
                    flex items-center
                    hover:underline
                  `}
                >
                  <TbMail className='mr-1 size-4' />
                  {connector.author_email}
                </a>
              </div>
            )}
          </div>

          <Separator />

          {/* Categories */}
          <div>
            <h4 className='mb-2 font-semibold'>
              {dict.connectors.categories}:
            </h4>
            <div className='flex flex-wrap gap-2'>
              {connector.primary_category && (
                <Badge key={connector.primary_category} variant='primary'>
                  {connector.primary_category.replace('_', ' ')}
                </Badge>
              )}
              {connector.categories
                ?.filter((category) => category !== connector.primary_category)
                .map((category) => (
                  <Badge key={category} variant='secondary'>
                    {category.replace('_', ' ')}
                  </Badge>
                ))}
            </div>
          </div>

          {/* Capabilities */}
          <div>
            <h4 className='mb-2 font-semibold'>
              {dict.connectors.capabilities}:
            </h4>
            <div className='flex flex-wrap gap-2'>
              {connector.capabilities.map((capability) => (
                <Badge key={capability} variant='primary'>
                  {capability}
                </Badge>
              ))}
            </div>
          </div>

          {/* Locales */}
          <div>
            <h4 className='mb-2 font-semibold'>{dict.connectors.locales}:</h4>
            <div className='flex flex-wrap gap-2'>
              {connector.locales.map((locale) => (
                <Badge key={locale} variant='primary'>
                  {locale}
                </Badge>
              ))}
            </div>
          </div>

          {/* External Link */}
          {connector.read_more_url && (
            <div className='pt-4'>
              <Button
                href={connector.read_more_url}
                target='_blank'
                rel='noopener noreferrer'
                className='w-full'
                variant='default'
              >
                {dict.common.readMore}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ConnectorInfoModal;
