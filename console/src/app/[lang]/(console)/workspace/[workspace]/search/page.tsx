import type { Metadata } from 'next';

import { getServerDict } from '@/lib/dict/server';

import SearchPageComponent from '@/components/search/SearchPageComponent';

type SearchParams = { lang: string };

export async function generateMetadata(props: {
  params: Promise<SearchParams>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  const dict = getServerDict(lang);
  return { title: dict.metadata.workspace.search };
}

export default function SearchPage() {
  return <SearchPageComponent />;
}
