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
import { setCookie } from '@/lib/utils/cookieUtils';

const LocaleContext = createContext<{
  locale: Locale;
  dict: Dictionary;
  switchLocale: (newLocale: Locale) => void;
}>({
  locale: defaultLocale,
  dict: {} as Dictionary,
  switchLocale: () => {},
});

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
    // Remove the current workspace from the local storage and state
    localStorage.removeItem('currentWorkspaceSlug');
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

export function useLocale() {
  return useContext(LocaleContext);
}
