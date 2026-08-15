'use client';

import { useCallback, useState } from 'react';

import { TbCheck, TbCopy, TbEye, TbEyeClosed } from 'react-icons/tb';

import { Button } from '@/components/ui/button';

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

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(token);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }, [token]);

  return (
    <div
      className={`w-full max-w-md overflow-hidden rounded-[2px] border bg-card`}
    >
      <div className='p-6'>
        <h2 className={`mb-2 text-2xl text-foreground`}>
          {dict.tokens.yourAPIToken}
        </h2>
        <p className={`mb-4 text-sm text-muted-foreground`}>
          {dict.tokens.storeTokenDescription}
        </p>
        <div
          className={`
            mb-4 flex items-center justify-between rounded-[2px] bg-muted p-4
          `}
        >
          {isRevealed ? (
            <code className={`font-mono text-sm break-all text-foreground`}>
              {token}
            </code>
          ) : (
            <div
              className={`
                h-6 w-full animate-pulse rounded-[2px] bg-muted-foreground/20
              `}
            />
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
                <TbEyeClosed className='mr-2 size-4' />
                {dict.tokens.tokenRevealed}
              </>
            ) : (
              <>
                <TbEye className='mr-2 size-4' />
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
                <TbCheck className='mr-2 size-4' />
                {dict.tokens.copied}
              </>
            ) : (
              <>
                <TbCopy className='mr-2 size-4' />
                {dict.tokens.copyToken}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
