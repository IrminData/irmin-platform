import React from 'react';

import { LogProvider } from '@/context/LogContext';

/**
 * Component to wrap the Logs pages in.
 *
 * @param children - The children to render
 */
export default function LogsLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LogProvider>{children}</LogProvider>;
}
