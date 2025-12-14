'use client';

import { useMemo } from 'react';

import dynamic from 'next/dynamic';

import { useTheme } from 'next-themes';

import DataSizeWarning from '@/components/ui/DataSizeWarning';

import { canSafelyRenderJSON, estimateDataSize } from '@/utils/dataSizeUtils';
import { downloadJSON } from '@/utils/downloadUtils';

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

  const isSafe = useMemo(
    () => (data && typeof data === 'object' ? canSafelyRenderJSON(data) : true),
    [data]
  );

  const dataSize = useMemo(
    () => (data && typeof data === 'object' ? estimateDataSize(data) : 0),
    [data]
  );

  if (!data || typeof data !== 'object') {
    return null;
  }

  if (!isSafe) {
    return (
      <DataSizeWarning
        dataSize={dataSize}
        type='json'
        severity='error'
        onDownload={() => downloadJSON(data, name ?? 'data')}
      />
    );
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
