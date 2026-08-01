'use client';

import SafeComponent from '@/components/ui/error/SafeComponent';

import { QueryProvider } from '@/context/QueryContext';

/**
 * Component to wrap the scripts pages in.
 * Provides context providers for the scripts interface.
 *
 * @param props - The props to pass to the component
 * @param props.children - The children to render
 */
export default function ScriptLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SafeComponent
      level='section'
      title='Scripts Interface Error'
      description='Failed to load scripts interface'
    >
      <QueryProvider>{children}</QueryProvider>
    </SafeComponent>
  );
}
