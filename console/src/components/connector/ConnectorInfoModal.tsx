'use client';

import {
  TbDownload,
  TbEdit,
  TbMail,
  TbUpload,
  TbWebhook,
  TbX,
} from 'react-icons/tb';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className={`
          flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0
          sm:max-w-2xl
        `}
      >
        {/* Header */}
        <DialogHeader
          className={`
            flex-row items-center justify-between border-b border-border px-6
            py-4 text-left
          `}
        >
          <div className='min-w-0'>
            <DialogTitle>{dict.connectors.connector}</DialogTitle>
            <DialogDescription className='mt-1 truncate'>
              {connector.name}
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <Button
              type='button'
              size='icon'
              variant='ghost'
              className={`
                shrink-0
                focus-visible:outline-2 focus-visible:outline-offset-2
                focus-visible:outline-accent
              `}
              aria-label={dict.common.close}
              title={dict.common.close}
              icon={<TbX aria-hidden='true' className='size-5' />}
            />
          </DialogClose>
        </DialogHeader>

        {/* Content */}
        <div className='flex flex-col gap-4 overflow-y-auto p-6'>
          {/* Connector Header */}
          <div className='mb-4 flex items-center space-x-4'>
            <Avatar className='size-16'>
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
              <p className='text-sm text-muted-foreground'>
                {connector.description}
              </p>
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
                  <TbMail aria-hidden='true' className='mr-1 size-4 shrink-0' />
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
              {connector.capabilities.map((capability) => {
                let icon = null;
                switch (capability) {
                  case 'pull':
                    icon = <TbDownload aria-hidden='true' className='mr-1' />;
                    break;
                  case 'push':
                    icon = <TbUpload aria-hidden='true' className='mr-1' />;
                    break;
                  case 'apply_patch':
                    icon = <TbEdit aria-hidden='true' className='mr-1' />;
                    break;
                  case 'patch_event':
                    icon = <TbWebhook aria-hidden='true' className='mr-1' />;
                    break;
                }

                return (
                  <TooltipProvider key={capability}>
                    <Tooltip>
                      <TooltipTrigger
                        type='button'
                        className={`
                          inline-flex items-center rounded-[2px] border
                          border-border bg-secondary px-1.5 py-0.5 text-[11px]
                          font-medium tracking-[0.02em]
                          text-secondary-foreground transition-colors
                          duration-150
                          focus-visible:outline-2 focus-visible:outline-offset-2
                          focus-visible:outline-accent
                        `}
                      >
                        {icon}
                        {capability}
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {
                            dict.connectors.capabilitiesDescription[
                              capability as keyof typeof dict.connectors.capabilitiesDescription
                            ]
                          }
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
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
      </DialogContent>
    </Dialog>
  );
}

export default ConnectorInfoModal;
