'use client';

import ReactJsonView from '@microlink/react-json-view';
import { useTheme } from 'next-themes';

import { JSONValue } from '@/types/internal/GenericJSON';

/**
 * JSONViewer component to display JSON data in a user-friendly format.
 *
 * @param props - Props for the JSONViewer component
 * @param props.data - The JSON data to display
 */
const JSONViewer = ({ data, name }: { data: JSONValue; name?: string }) => {
  const { resolvedTheme } = useTheme();
  const jsonTheme = resolvedTheme === 'dark' ? 'google' : 'rjv-default';
  if (typeof data !== 'object') {
    return <></>;
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
