import type { Metadata } from 'next';

import { getServerDict } from '@/lib/dict/server';

import RepositoryCommitsSection from '@/components/repository/RepositoryCommitsSection';

export async function generateMetadata(props: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  return { title: getServerDict(lang).metadata.resource.commits };
}

/**
 * Page for the Repository commits.
 */
export default function RepositoryCommitsPage() {
  return <RepositoryCommitsSection />;
}
