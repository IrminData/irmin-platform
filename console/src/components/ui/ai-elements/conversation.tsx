'use client';

import type { ComponentProps } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { TbArrowDown } from 'react-icons/tb';

import { Button } from '@/components/ui/button';

import { cn } from '@/utils/tw';

export type ConversationProps = ComponentProps<'div'>;

export const Conversation = ({
  className,
  children,
  ...props
}: ConversationProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const checkIfAtBottom = useCallback(() => {
    if (!containerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isBottom = scrollTop + clientHeight >= scrollHeight - 10;
    setIsAtBottom(isBottom);
  }, []);

  const scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', checkIfAtBottom, { passive: true });
      return () => container.removeEventListener('scroll', checkIfAtBottom);
    }
  }, [checkIfAtBottom]);

  // Auto-scroll to bottom when content changes
  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [children, isAtBottom, scrollToBottom]);

  return (
    <div
      ref={containerRef}
      className={cn('relative flex-1 overflow-y-auto', className)}
      role='log'
      id='conversation-container'
      style={{
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
      {...props}
    >
      {children}
    </div>
  );
};

export type ConversationContentProps = ComponentProps<'div'>;

export const ConversationContent = ({
  className,
  ...props
}: ConversationContentProps) => (
  <div className={cn('p-2', className)} id='conversation-content' {...props} />
);

export type ConversationScrollButtonProps = ComponentProps<typeof Button>;

export const ConversationScrollButton = ({
  className,
  ...props
}: ConversationScrollButtonProps) => {
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [buttonPosition, setButtonPosition] = useState({
    left: '50%',
    bottom: '6rem',
  });

  const checkIfAtBottom = useCallback(() => {
    const container = document.getElementById('conversation-container');
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isBottom = scrollTop + clientHeight >= scrollHeight - 10;
    setIsAtBottom(isBottom);
  }, []);

  const scrollToBottom = useCallback(() => {
    const container = document.getElementById('conversation-container');
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, []);

  const updateButtonPosition = useCallback(() => {
    const container = document.getElementById('conversation-container');
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const left = rect.left + rect.width / 2;
    const bottom = window.innerHeight - rect.bottom + 16; // 16px from bottom of container

    setButtonPosition({
      left: `${left}px`,
      bottom: `${bottom}px`,
    });
  }, []);

  useEffect(() => {
    const container = document.getElementById('conversation-container');
    if (container) {
      container.addEventListener('scroll', checkIfAtBottom, { passive: true });
      window.addEventListener('resize', updateButtonPosition, {
        passive: true,
      });
      queueMicrotask(() => {
        updateButtonPosition();
      });

      return () => {
        container.removeEventListener('scroll', checkIfAtBottom);
        window.removeEventListener('resize', updateButtonPosition);
      };
    }
  }, [checkIfAtBottom, updateButtonPosition]);

  // Check initial state
  useEffect(() => {
    queueMicrotask(() => {
      checkIfAtBottom();
    });
  }, [checkIfAtBottom]);

  if (isAtBottom) return null;

  return (
    <div
      className='fixed z-50'
      style={{
        left: buttonPosition.left,
        bottom: buttonPosition.bottom,
        transform: 'translateX(-50%)',
      }}
    >
      <Button
        className={cn('rounded-full', className)}
        onClick={scrollToBottom}
        title='Scroll to bottom'
        size='icon'
        type='button'
        variant='gray'
        aria-label='Scroll to bottom'
        {...props}
      >
        <TbArrowDown className='size-3' />
      </Button>
    </div>
  );
};
