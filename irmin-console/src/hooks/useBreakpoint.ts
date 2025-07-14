import { useMediaQuery } from 'react-responsive';

import type { BreakpointKey } from '@/utils/tw';
import { breakpoints } from '@/utils/tw';

/**
 * Hook to determine if the screen is at least a certain breakpoint
 * @param breakpointKey - The breakpoint to check
 * @returns An object with a key of `is${Breakpoint}` and a boolean value
 */
export function useBreakpoint<K extends BreakpointKey>(breakpointKey: K) {
  const bool = useMediaQuery({
    query: `(min-width: ${breakpoints[breakpointKey]})`,
  });
  const capitalizedKey =
    breakpointKey[0].toUpperCase() + breakpointKey.substring(1);
  type Key = `is${Capitalize<K>}`;
  return {
    [`is${capitalizedKey}`]: bool,
  } as Record<Key, boolean>;
}
