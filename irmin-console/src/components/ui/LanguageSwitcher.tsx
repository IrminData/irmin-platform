'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import dynamic from 'next/dynamic';

import { SingleValue } from 'react-select';

import { languages, Locale } from '@/lib/dict';

import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';

const ReactSelect = dynamic(() => import('react-select'), {
  loading: () => <LoadingSkeleton className='h-8' />,
});

/**
 * Language switcher component
 *
 * @remarks
 *
 * This component is used to display a language switcher in the application.
 *
 * It allows users to change the language of the application.
 * It uses the LocaleContext to switch the language. See {@link useLocale}
 */
export default function LanguageSwitcher() {
  const { locale, dict, switchLocale } = useLocale();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const currentLanguage = useMemo(
    () => languages.find((lang) => lang.code === locale),
    [locale]
  );
  const options = useMemo(
    () =>
      languages.map((lang) => ({
        value: lang.code,
        label: lang.name,
      })),
    []
  );
  const changeHandler = useCallback(
    (val: unknown) => {
      const value = val as SingleValue<{ value: Locale; label: string }>;
      if (value && value.value) {
        switchLocale(value.value);
      }
    },
    [switchLocale]
  );

  if (!currentLanguage || !dict || !isMounted)
    return <LoadingSkeleton className='h-8' />;

  return (
    <ReactSelect
      value={{
        value: currentLanguage.code,
        label: currentLanguage.name,
      }}
      onChange={changeHandler}
      options={options}
      isSearchable={false}
      isClearable={false}
      placeholder={dict.misc.selectLanguage}
      noOptionsMessage={() => dict.misc.noOptionsMessage}
      className='react-select-container'
      classNamePrefix='react-select'
      id='language-switcher'
    />
  );
}
