'use client';

import { languages, Locale } from '@/dictionaries';

import { useLocale } from '@/context/LocaleContext';

export default function LanguageSwitcher({
  className,
}: {
  className?: string;
}) {
  const { locale, switchLocale } = useLocale();

  return (
    <select
      value={locale}
      onChange={(e) => switchLocale(e.target.value as Locale)}
      className={className}
      aria-label='Select language'
    >
      {languages.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.name}
        </option>
      ))}
    </select>
  );
}
