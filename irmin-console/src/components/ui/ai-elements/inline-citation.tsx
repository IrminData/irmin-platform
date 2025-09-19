'use client';

import { type ComponentProps, useCallback, useEffect, useState } from 'react';

import { TbArrowLeft, TbArrowRight } from 'react-icons/tb';

import { Badge } from '@/components/ui/badge';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  useCarousel,
} from '@/components/ui/carousel';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';

import { cn } from '@/utils/tw';

export type InlineCitationProps = ComponentProps<'span'>;

export const InlineCitation = ({
  className,
  ...props
}: InlineCitationProps) => (
  <span
    className={cn('group inline items-center gap-1', className)}
    {...props}
  />
);

export type InlineCitationTextProps = ComponentProps<'span'>;

export const InlineCitationText = ({
  className,
  ...props
}: InlineCitationTextProps) => (
  <span
    className={cn(
      `
        transition-colors
        group-hover:bg-accent
      `,
      className
    )}
    {...props}
  />
);

export type InlineCitationCardProps = ComponentProps<typeof HoverCard>;

export const InlineCitationCard = (props: InlineCitationCardProps) => (
  <HoverCard closeDelay={0} openDelay={0} {...props} />
);

export type InlineCitationCardTriggerProps = ComponentProps<typeof Badge> & {
  sources: string[];
};

// Helper function to safely extract hostname from a URL string
const getHostnameFromUrl = (urlString: string): string => {
  try {
    const url = new URL(urlString);
    return url.hostname;
  } catch {
    // If URL is invalid, try to extract a reasonable fallback
    // Remove protocol if present and get the first part before slash
    const cleanUrl = urlString.replace(/^https?:\/\//, '');
    const hostname = cleanUrl.split('/')[0];
    return hostname || 'unknown';
  }
};

export const InlineCitationCardTrigger = ({
  sources,
  className,
  ...props
}: InlineCitationCardTriggerProps) => (
  <HoverCardTrigger asChild>
    <Badge
      className={cn('ml-1 rounded-full', className)}
      variant='secondary'
      {...props}
    >
      {sources.length ? (
        <>
          {getHostnameFromUrl(sources[0])}{' '}
          {sources.length > 1 && `+${sources.length - 1}`}
        </>
      ) : (
        'unknown'
      )}
    </Badge>
  </HoverCardTrigger>
);

export type InlineCitationCardBodyProps = ComponentProps<'div'>;

export const InlineCitationCardBody = ({
  className,
  ...props
}: InlineCitationCardBodyProps) => (
  <HoverCardContent className={cn('relative w-80 p-0', className)} {...props} />
);

export type InlineCitationCarouselProps = ComponentProps<typeof Carousel>;

export const InlineCitationCarousel = ({
  className,
  ...props
}: InlineCitationCarouselProps) => (
  <Carousel className={cn('w-full', className)} {...props} />
);

export type InlineCitationCarouselContentProps = ComponentProps<'div'>;

export const InlineCitationCarouselContent = (
  props: InlineCitationCarouselContentProps
) => <CarouselContent {...props} />;

export type InlineCitationCarouselItemProps = ComponentProps<'div'>;

export const InlineCitationCarouselItem = ({
  className,
  ...props
}: InlineCitationCarouselItemProps) => (
  <CarouselItem className={cn('w-full space-y-2 p-4', className)} {...props} />
);

export type InlineCitationCarouselHeaderProps = ComponentProps<'div'>;

export const InlineCitationCarouselHeader = ({
  className,
  ...props
}: InlineCitationCarouselHeaderProps) => (
  <div
    className={cn(
      'flex items-center justify-between gap-2 rounded-t-md bg-secondary p-2',
      className
    )}
    {...props}
  />
);

export type InlineCitationCarouselIndexProps = ComponentProps<'div'>;

export const InlineCitationCarouselIndex = ({
  children,
  className,
  ...props
}: InlineCitationCarouselIndexProps) => {
  const { api } = useCarousel();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!api) {
      return;
    }

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on('select', () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  return (
    <div
      className={cn(
        `
          flex flex-1 items-center justify-end px-3 py-1 text-xs
          text-muted-foreground
        `,
        className
      )}
      {...props}
    >
      {children ?? `${current}/${count}`}
    </div>
  );
};

export type InlineCitationCarouselPrevProps = ComponentProps<'button'>;

export const InlineCitationCarouselPrev = ({
  className,
  ...props
}: InlineCitationCarouselPrevProps) => {
  const { api } = useCarousel();

  const handleClick = useCallback(() => {
    if (api) {
      api.scrollPrev();
    }
  }, [api]);

  return (
    <button
      aria-label='Previous'
      className={cn('shrink-0', className)}
      onClick={handleClick}
      type='button'
      {...props}
    >
      <TbArrowLeft className='size-4 text-muted-foreground' />
    </button>
  );
};

export type InlineCitationCarouselNextProps = ComponentProps<'button'>;

export const InlineCitationCarouselNext = ({
  className,
  ...props
}: InlineCitationCarouselNextProps) => {
  const { api } = useCarousel();

  const handleClick = useCallback(() => {
    if (api) {
      api.scrollNext();
    }
  }, [api]);

  return (
    <button
      aria-label='Next'
      className={cn('shrink-0', className)}
      onClick={handleClick}
      type='button'
      {...props}
    >
      <TbArrowRight className='size-4 text-muted-foreground' />
    </button>
  );
};

export type InlineCitationSourceProps = ComponentProps<'div'> & {
  title?: string;
  url?: string;
  description?: string;
};

export const InlineCitationSource = ({
  title,
  url,
  description,
  className,
  children,
  ...props
}: InlineCitationSourceProps) => (
  <div className={cn('space-y-1', className)} {...props}>
    {title && (
      <h4 className='truncate text-sm leading-tight font-medium'>{title}</h4>
    )}
    {url && (
      <p className='truncate text-xs break-all text-muted-foreground'>{url}</p>
    )}
    {description && (
      <p className='line-clamp-3 text-sm leading-relaxed text-muted-foreground'>
        {description}
      </p>
    )}
    {children}
  </div>
);

export type InlineCitationQuoteProps = ComponentProps<'blockquote'>;

export const InlineCitationQuote = ({
  children,
  className,
  ...props
}: InlineCitationQuoteProps) => (
  <blockquote
    className={cn(
      'border-l-2 border-muted pl-3 text-sm text-muted-foreground italic',
      className
    )}
    {...props}
  >
    {children}
  </blockquote>
);
