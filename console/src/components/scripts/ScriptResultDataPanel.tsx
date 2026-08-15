import type { PropsWithChildren } from 'react';

/**
 * Provides the bounded layout used by the structured script-result table.
 *
 * @param props - Component props containing the result table or empty state.
 */
export function ScriptResultDataPanel({ children }: PropsWithChildren) {
  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
      {children}
    </div>
  );
}
