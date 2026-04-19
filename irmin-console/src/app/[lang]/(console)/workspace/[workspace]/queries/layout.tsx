import type { Metadata } from 'next';

import type { Locale } from '@/lib/dict';
import { getServerDict } from '@/lib/dict/server';

import { QueryProvider } from '@/context/QueryContext';

/**
 * URL parameters for the Queries layout
 */
export type QuriesLayoutParams = {
  lang: Locale;
  workspace: string;
};

export async function generateMetadata(props: {
  params: Promise<QuriesLayoutParams>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  return { title: getServerDict(lang).metadata.sections.queries };
}

/**
 * Layout for the Queries page in the Console
 */
export default async function QueriesLayout({
  children,
}: {
  children: React.ReactNode;
  params: Promise<QuriesLayoutParams>;
}) {
  return <QueryProvider>{children}</QueryProvider>;
}
