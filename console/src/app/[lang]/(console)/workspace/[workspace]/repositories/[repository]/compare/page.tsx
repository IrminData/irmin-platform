import type { Metadata } from 'next';

import { getServerDict } from '@/lib/dict/server';

import RepositoryCompareSection from '@/components/repository/RepositoryCompareSection';

export async function generateMetadata(props: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  return { title: getServerDict(lang).metadata.resource.compare };
}

/**
 * Page for the Repository diff comparison and merge.
 */
export default function RepositoryCompareSectionPage() {
  return <RepositoryCompareSection />;
}
