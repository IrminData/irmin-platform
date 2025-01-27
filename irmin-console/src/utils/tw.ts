import { type ClassValue, clsx } from 'clsx';
import { useMediaQuery } from 'react-responsive';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const breakpoints = {
  '@3xs': '16rem', // 256px
  '@2xs': '18rem', // 288px
  '@xs': '20rem', // 320px
  '@sm': '24rem', // 384px
  '@md': '28rem', // 448px
  '@lg': '32rem', // 512px
  '@xl': '36rem', // 576px
  '@2xl': '42rem', // 672px
  '@3xl': '48rem', // 768px
  '@4xl': '56rem', // 896px
  '@5xl': '64rem', // 1024px
  '@6xl': '72rem', // 1152px
  '@7xl': '80rem', // 1280px
};

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
