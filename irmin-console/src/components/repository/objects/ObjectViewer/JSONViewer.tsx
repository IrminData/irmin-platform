'use client';

import { useMemo } from 'react';

import dynamic from 'next/dynamic';

import { useTheme } from 'next-themes';

import type { JSONValue } from '@/types/internal/GenericJSON';

const ReactJsonView = dynamic(() => import('@microlink/react-json-view'), {
  ssr: false,
});

const JSONViewer = ({ data, name }: { data: JSONValue; name?: string }) => {
  const { resolvedTheme } = useTheme();
  const jsonTheme = useMemo(
    () => (resolvedTheme === 'dark' ? 'google' : 'rjv-default'),
    [resolvedTheme]
  );

  if (!data || typeof data !== 'object') {
    return null;
  }

  return (
    <ReactJsonView
      src={data as object}
      theme={jsonTheme}
      name={name}
      enableClipboard={true}
      displayDataTypes={true}
      displayObjectSize={true}
      collapsed={1}
    />
  );
};

export default JSONViewer;
