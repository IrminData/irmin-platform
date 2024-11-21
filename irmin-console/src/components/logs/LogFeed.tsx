'use client';

import { LazyLog, ScrollFollow } from '@melloware/react-logviewer';

/**
 * Component to display logs in a feed
 *
 * @param props - The props for the LogFeed component
 * @param props.url - The URL to fetch logs from
 * @param props.stream - Whether to stream logs from the URL
 * @param props.text - Text logs to use if URL is not provided
 * @param props.height - The height of the log feed, defaults to 'auto'
 */
const LogFeed = ({
  url,
  stream = false,
  text,
  height = 'auto',
}: {
  url?: string;
  stream?: boolean;
  text?: string;
  height?: string;
}) => {
  if (url) {
    return (
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
    );
  }
  return (
    <ScrollFollow
      startFollowing={true}
      render={({ follow, onScroll }) => (
        <LazyLog
          caseInsensitive
          enableHotKeys
          enableSearch
          extraLines={1}
          height={height}
          text={text ?? ''}
          follow={follow}
          onScroll={onScroll}
        />
      )}
    />
  );
};

export default LogFeed;
