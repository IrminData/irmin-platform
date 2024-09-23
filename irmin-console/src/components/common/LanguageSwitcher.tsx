'use client';

import { languages } from '@/dictionaries';
import ReactSelect from 'react-select';

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
export default function LanguageSwitcher() {
  const { locale, dict, switchLocale } = useLocale();

  const currentLanguage = languages.find((lang) => lang.code === locale);

  return (
    <div id='language-switcher'>
      <ReactSelect
        value={{
          value: currentLanguage?.code,
          label: currentLanguage?.name,
        }}
        onChange={(val) => {
          if (val && val.value) {
            switchLocale(val.value);
          }
        }}
        options={languages.map((lang) => ({
          value: lang.code,
          label: lang.name,
        }))}
        isSearchable={false}
        isClearable={false}
        placeholder={dict.misc.selectLanguage}
        noOptionsMessage={() => dict.misc.noOptionsMessage}
        className='react-select-container'
        classNamePrefix='react-select'
      />
    </div>
  );
}
