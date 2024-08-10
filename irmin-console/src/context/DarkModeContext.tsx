'use client';

import { ThemeProvider } from 'next-themes';

/**
 * Dark mode provider for the application.
 * Uses {@link https://github.com/pacocoursey/next-themes | next-themes} to enable dark mode
 */
export function DarkModeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider enableSystem attribute='class' defaultTheme='system'>
      {children}
    </ThemeProvider>
  );
}
