'use client';

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';

import { useParams, usePathname, useRouter } from 'next/navigation';

import { Dictionary, getDictionary } from '@/dictionaries';
import { setCookie } from '@/lib/utils';

interface LocaleContextType {
  locale: string;
  dict: Dictionary;
  switchLocale: (newLocale: string) => void;
}

const LocaleContext = createContext<LocaleContextType>({
  locale: 'en',
  dict: {} as Dictionary,
  switchLocale: () => {},
});

interface LocaleProviderProps {
  children: ReactNode;
}

export function LocaleProvider({ children }: LocaleProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { lang } = useParams() as { lang: string };
  const [locale, setLocale] = useState<string>(lang ?? 'en');
  const [dict, setDict] = useState<Dictionary | null>(null);

  useEffect(() => {
    async function fetchDictionary() {
      const dictionary = await getDictionary(locale);
      setDict(dictionary);
    }
    fetchDictionary();
  }, [locale]);

  const switchLocale = (newLocale: string) => {
    setLocale(newLocale);
    setCookie('locale', newLocale, 365);
    router.push(`/${newLocale}${pathname.substring(3)}`);
  };

  useEffect(() => {
    if (lang !== locale) {
      setLocale(lang);
      setCookie('locale', lang, 365);
    }
  }, [lang]);

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
