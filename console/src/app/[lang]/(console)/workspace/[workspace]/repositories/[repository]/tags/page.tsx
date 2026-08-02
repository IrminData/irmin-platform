import type { Metadata } from 'next';

import { getServerDict } from '@/lib/dict/server';

import RepositoryTagsSection from '@/components/repository/RepositoryTagsSection';

export async function generateMetadata(props: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  return { title: getServerDict(lang).metadata.resource.tags };
}

/**
 * Page for the Repository Tags.
 */
export default function RepositoryTagsPage() {
  return <RepositoryTagsSection />;
}
