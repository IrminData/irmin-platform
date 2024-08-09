'use client';

import { languages, Locale } from '@/dictionaries';

import Select from '@/components/common/select/Select';

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
export default function LanguageSwitcher({
  variant = 'default',
}: {
  variant?: 'default' | 'on-dark-bg';
}) {
  const { locale, dict, switchLocale } = useLocale();

  return (
    <Select
      currentValue={locale as string}
      onChange={(e) => switchLocale(e.target.value as Locale)}
      options={languages.map((lang) => ({
        value: lang.code,
        label: lang.name,
      }))}
      loading={false}
      label={dict.misc.selectLanguage}
      defaultValue=''
      variant={variant}
    />
  );
}
