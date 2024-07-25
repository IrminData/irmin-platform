import { type ClassValue, clsx } from 'clsx';
import { useMediaQuery } from 'react-responsive';
import { twMerge } from 'tailwind-merge';
import resolveConfig from 'tailwindcss/resolveConfig';

import tailwindConfig from '../../../tailwind.config';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const twConfig = resolveConfig(tailwindConfig);

const breakpoints = twConfig.theme.screens;
type BreakpointKey = keyof typeof breakpoints;

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
