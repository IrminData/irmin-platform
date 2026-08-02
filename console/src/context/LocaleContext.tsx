'use client';

import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useMemo } from 'react';

import { useParams, usePathname, useRouter } from 'next/navigation';

import type { Dictionary, Locale } from '@/lib/dict';
import { defaultLocale, dictionaries } from '@/lib/dict';

import { setCookie } from '@/utils/cookie';

/**
 * Locale context to provide the locale and dictionary to the app
 */
const LocaleContext = createContext<{
  locale: Locale;
  dict: Dictionary;
  switchLocale: (_newLocale: Locale) => void;
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

      // Remove the current locale from the pathname before adding the new locale
      // pathname format: /[locale]/rest/of/path
      const pathWithoutLocale = pathname.replace(`/${locale}`, '') || '/';

      router.push(`/${newLocale}${pathWithoutLocale}`);
    },
    [pathname, router, locale]
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
