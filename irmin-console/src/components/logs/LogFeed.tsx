'use client';

import { useState } from 'react';

import { LazyLog, ScrollFollow } from '@melloware/react-logviewer';

import { TbCheck, TbCopy } from 'react-icons/tb';

import { Button } from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';

/**
 * Component to display logs in a feed
 *
 * @param props - The props for the LogFeed component
 * @param props.url - The URL to fetch logs from
 * @param props.stream - Whether to stream logs from the URL
 * @param props.logs - Array of text logs to use if URL is not provided
 * @param props.height - The height of the log feed, defaults to 'auto'
 */
const LogFeed = ({
  url,
  stream = false,
  logs = [],
  height = 'auto',
}: {
  url?: string;
  stream?: boolean;
  logs?: string[];
  height?: string;
}) => {
  const { dict } = useLocale();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    let textToCopy = '';

    if (logs.length > 0) {
      textToCopy = logs.join('\n');
    } else if (url) {
      try {
        const response = await fetch(url);
        textToCopy = await response.text();
      } catch (error) {
        console.error('Error fetching logs for copy:', error);
        return;
      }
    }

    if (textToCopy) {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    }
  };

  return (
    <div className='relative h-full'>
      {url ? (
        <ScrollFollow
          startFollowing={true}
          render={({ follow, onScroll }) => (
            <LazyLog
              caseInsensitive
              enableHotKeys
              enableSearch
              extraLines={1}
              stream={stream}
              height={height}
              url={url}
              follow={follow}
              onScroll={onScroll}
            />
          )}
        />
      ) : (
        <ScrollFollow
          startFollowing={true}
          render={({ follow, onScroll }) => (
            <LazyLog
              caseInsensitive
              enableHotKeys
              enableSearch
              extraLines={1}
              height={height}
              text={logs.join('\n') ?? ''}
              follow={follow}
              onScroll={onScroll}
            />
          )}
        />
      )}
      <Button
        variant='ghost'
        size='sm'
        className='absolute top-1 left-10'
        onClick={handleCopy}
        title={copied ? dict.common.copied : dict.common.copy}
        icon={
          copied ? (
            <TbCheck size={12} className='text-green-500' />
          ) : (
            <TbCopy size={12} />
          )
        }
      >
        {copied ? dict.common.copied : dict.common.copy}
      </Button>
    </div>
  );
};

export default LogFeed;
