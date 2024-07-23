import en from '@/dictionaries/en.json';
import fi from '@/dictionaries/fi.json';

export type Dictionary = typeof en;

export const languages = [
  { code: 'en', name: 'English' },
  { code: 'fi', name: 'Suomi' },
];

const dictionaries: { [key: string]: Dictionary } = {
  en: en,
  fi: fi,
};

export async function getDictionary(lang: string): Promise<Dictionary> {
  return dictionaries[lang] || dictionaries.en;
}
