'use client';

import { languages } from '@/dictionaries';

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
      onChange={(e) => switchLocale(e.target.value)}
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
