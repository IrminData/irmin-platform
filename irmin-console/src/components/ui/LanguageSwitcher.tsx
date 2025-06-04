'use client';

import { memo, useCallback, useEffect, useMemo, useState } from 'react';

import { languages, Locale } from '@/lib/dict';

import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useLocale } from '@/context/LocaleContext';

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
const LanguageSwitcher = () => {
  const { locale, dict, switchLocale } = useLocale();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const currentLanguage = useMemo(
    () => languages.find((lang) => lang.code === locale),
    [locale]
  );

  const changeHandler = useCallback(
    (value: string) => {
      switchLocale(value as Locale);
    },
    [switchLocale]
  );

  if (!currentLanguage || !dict || !isMounted)
    return <LoadingSkeleton className='h-8' />;

  return (
    <Select
      value={currentLanguage.code}
      onValueChange={changeHandler}
      disabled={!isMounted}
    >
      <SelectTrigger className='w-[140px]'>
        <SelectValue placeholder={dict.common.selectLanguage}>
          {currentLanguage.name}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {languages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code}>
            {lang.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default memo(LanguageSwitcher);
