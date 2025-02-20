'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
} from 'react';

import { useParams, usePathname, useRouter } from 'next/navigation';

import { defaultLocale, dictionaries, Dictionary, Locale } from '@/lib/dict';

import { setCookie } from '@/utils/cookie';

/**
 * Locale context to provide the locale and dictionary to the app
 */
const LocaleContext = createContext<{
  locale: Locale;
  dict: Dictionary;
  switchLocale: (newLocale: Locale) => void;
}>({
  locale: defaultLocale,
  dict: {} as Dictionary,
  switchLocale: () => {},
});

/**
 * Locale provider component to provide the locale context to the app
 * and handle locale switching
 *
 * @param children - The children components
 * @returns The locale provider component
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { lang } = useParams();

  const locale = useMemo<Locale>(
    () =>
      typeof lang === 'string' && dictionaries[lang]
        ? (lang as Locale)
        : defaultLocale,
    [lang]
  );
  const dict = useMemo<Dictionary>(() => dictionaries[locale], [locale]);

  /**
   * Switch the locale and update the cookie
   */
  const switchLocale = useCallback(
    (newLocale: Locale) => {
      setCookie('locale', newLocale, 365);
      router.push(`/${newLocale}${pathname}`);
    },
    [pathname, router]
  );

  const value = useMemo(
    () => ({ locale, dict, switchLocale }),
    [locale, dict, switchLocale]
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

/**
 * Hook to use the locale context
 */
export const useLocale = () => {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
};
