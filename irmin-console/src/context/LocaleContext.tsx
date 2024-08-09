'use client';

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';

import { useParams, usePathname } from 'next/navigation';

import {
  defaultLocale,
  dictionaries,
  Dictionary,
  getDictionary,
  Locale,
} from '@/dictionaries';

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

  const params = useParams() as { lang: Locale };
  const requestPathLang = params.lang;

  const [locale, setLocale] = useState<Locale>(
    dictionaries[requestPathLang] ? requestPathLang : defaultLocale
  );
  const [dict, setDict] = useState<Dictionary>(
    dictionaries[requestPathLang] ?? dictionaries[defaultLocale]
  );

  useEffect(() => {
    const dictionary = getDictionary(locale);
    setDict(dictionary);
  }, [locale]);

  const switchLocale = (newLocale: Locale) => {
    setLocale(newLocale);
    setCookie('locale', newLocale, 365);
    setCookie('currentWorkspaceSlug', '', -1);
    // Redirect to the new locale
    window.open(`/${newLocale}${pathname.substring(3)}`, '_self');
  };

  useEffect(() => {
    if (requestPathLang !== locale) {
      setLocale(requestPathLang);
      setCookie('locale', requestPathLang, 365);
    }
  }, [requestPathLang, locale]);

  if (!dict) {
    return <></>;
  }

  return (
    <LocaleContext.Provider value={{ locale, dict, switchLocale }}>
      {children}
    </LocaleContext.Provider>
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
