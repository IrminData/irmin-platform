import type { Metadata } from 'next';

import { getServerDict } from '@/lib/dict/server';

import RepositoryObjectSection from '@/components/repository/RepositoryObjectSection';

import type { PageSearchParams } from '@/types/internal/PageSearchParams';

import type { RepositoryRouteParams } from '../layout';

export async function generateMetadata(props: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  return { title: getServerDict(lang).metadata.resource.object };
}

/**
 * Page to view a repository object from a specific path at a specific ref.
 * GitHub-like layout with filetree at top, content in middle, and details sidebar.
 */
export default async function RepositoryObjectPage(props: {
  params: Promise<RepositoryRouteParams>;
  searchParams: Promise<PageSearchParams>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const ref =
    typeof searchParams.ref === 'string' ? searchParams.ref : undefined;
  const path =
    typeof searchParams.path === 'string' ? searchParams.path : undefined;

  return (
    <RepositoryObjectSection
      repositorySlug={params.repository}
      repositoryRef={ref}
      path={path}
    />
  );
}
