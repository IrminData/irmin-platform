'use client';

import { useCallback, useState } from 'react';

import { TbCheck, TbCopy, TbEye, TbEyeClosed } from 'react-icons/tb';

import Button from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';

/**
 * Component to display an API token and allow the user to reveal and copy it.
 *
 * @param props - The component props.
 * @param props.token - The API token to display.
 */
export default function APITokenDisplay({ token }: { token: string }) {
  const { dict } = useLocale();

  const [isRevealed, setIsRevealed] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleReveal = useCallback(() => {
    setIsRevealed(true);
  }, []);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(token).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  }, [token]);

  return (
    <div className='w-full max-w-md overflow-hidden rounded-lg bg-white shadow-lg dark:bg-gray-800'>
      <div className='p-6'>
        <h2 className='mb-2 text-2xl text-gray-800 dark:text-white'>
          {dict.tokens.yourAPIToken}
        </h2>
        <p className='mb-4 text-sm text-gray-600 dark:text-gray-300'>
          {dict.tokens.storeTokenDescription}
        </p>
        <div className='mb-4 flex items-center justify-between rounded-md bg-gray-100 p-4 dark:bg-gray-700'>
          {isRevealed ? (
            <code className='break-all font-mono text-sm text-gray-800 dark:text-gray-200'>
              {token}
            </code>
          ) : (
            <div className='h-6 w-full animate-pulse rounded bg-gray-300 dark:bg-gray-600'></div>
          )}
        </div>
        <div className='flex justify-between'>
          <Button
            onClick={handleReveal}
            disabled={isRevealed}
            variant={isRevealed ? 'gray' : 'default'}
          >
            {isRevealed ? (
              <>
                <TbEyeClosed className='mr-2 h-4 w-4' />
                {dict.tokens.tokenRevealed}
              </>
            ) : (
              <>
                <TbEye className='mr-2 h-4 w-4' />
                {dict.tokens.revealToken}
              </>
            )}
          </Button>
          <Button
            onClick={handleCopy}
            disabled={!isRevealed}
            variant={!isRevealed ? 'gray' : 'default'}
          >
            {isCopied ? (
              <>
                <TbCheck className='mr-2 h-4 w-4' />
                {dict.tokens.copied}
              </>
            ) : (
              <>
                <TbCopy className='mr-2 h-4 w-4' />
                {dict.tokens.copyToken}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
