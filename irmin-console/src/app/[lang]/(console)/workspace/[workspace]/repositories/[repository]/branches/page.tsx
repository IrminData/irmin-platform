import type { Metadata } from 'next';

import { getServerDict } from '@/lib/dict/server';

import RepositoryBranchesSection from '@/components/repository/RepositoryBranchesSection';

export async function generateMetadata(props: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  return { title: getServerDict(lang).metadata.resource.branches };
}

/**
 * Page for the Repository branches.
 */
export default function RepositoryBranchesPage() {
  return <RepositoryBranchesSection />;
}
