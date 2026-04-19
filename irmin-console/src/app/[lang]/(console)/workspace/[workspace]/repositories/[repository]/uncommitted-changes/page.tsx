import type { Metadata } from 'next';

import { getServerDict } from '@/lib/dict/server';

import RepositoryUncommittedChangesSection from '@/components/repository/RepositoryUncommittedChangesSection';

export async function generateMetadata(props: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  return { title: getServerDict(lang).metadata.resource.uncommittedChanges };
}

/**
 * Page for the Repository uncommitted changes on a branch.
 */
export default function RepositoryUncommittedchangesPage() {
  return <RepositoryUncommittedChangesSection />;
}
