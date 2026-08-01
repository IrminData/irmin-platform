import type { Metadata } from 'next';

import { getServerDict } from '@/lib/dict/server';

import RepositoryObjectHistorySection from '@/components/repository/RepositoryObjectHistorySection';

import type { PageSearchParams } from '@/types/internal/PageSearchParams';

export async function generateMetadata(props: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  return { title: getServerDict(lang).metadata.resource.objectHistory };
}

/**
 * Page to view a repository object from a specific path at a specific ref
 */
export default async function RepositoryObjectHistoryPage(props: {
  searchParams: Promise<PageSearchParams>;
}) {
  const searchParams = await props.searchParams;
  const path = (searchParams.path as string) ?? '';

  return <RepositoryObjectHistorySection path={path} />;
}
