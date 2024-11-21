'use client';

import { useEffect, useRef } from 'react';

import { useLocale } from '@/context/LocaleContext';

/**
 * Component to display logs in a feed
 *
 * @param props - The props for the LogFeed component
 * @param props.logs - The logs to display
 * @param props.height - The height of the log feed
 */
const LogFeed = ({
  logs,
  height = 'auto',
}: {
  logs: string[];
  height?: number | 'auto';
}) => {
  const { dict } = useLocale();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [logs]);

  const highlightLog = (log: string) => {
    if (log.toLowerCase().includes('[error]')) {
      return 'text-red-500 font-semibold';
    } else if (log.toLowerCase().includes('[warning]')) {
      return 'text-yellow-500';
    } else if (log.toLowerCase().includes('[info]')) {
      return 'text-blue-500';
    } else {
      return 'text-foreground';
    }
  };

  const getHeightStyle = () => {
    if (height === 'auto') {
      return { maxHeight: '80vh', height: 'auto' };
    }
    return { height: `${height}px` };
  };

  return (
    <div
      ref={scrollAreaRef}
      className='w-full overflow-y-auto rounded bg-background p-4'
      style={getHeightStyle()}
      role='log'
      aria-live='polite'
    >
      {logs.length > 0 ? (
        logs.map((log, index) => (
          <div
            key={index}
            className={`my-1 font-mono text-sm ${highlightLog(log)}`}
          >
            {log}
          </div>
        ))
      ) : (
        <div className='text-center text-muted-foreground'>
          {dict.logs.noLogsFound}
        </div>
      )}
    </div>
  );
};

export default LogFeed;
