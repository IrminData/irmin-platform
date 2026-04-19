import type { Metadata } from 'next';

import { getServerDict } from '@/lib/dict/server';

import RepositorySchemaSection from '@/components/repository/RepositorySchemaSection';

import type { PageSearchParams } from '@/types/internal/PageSearchParams';

export async function generateMetadata(props: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  return { title: getServerDict(lang).metadata.resource.schema };
}

/**
 * Page for the Repository Schema viewer
 *
 * Uses {@link RepositorySchemaSection} to display the Repository Schema.
 * Reads the `path` search parameter from the URL to support deep-linking
 * to a specific object's schema.
 */
export default async function RepositorySchemaPage(props: {
  searchParams: Promise<PageSearchParams>;
}) {
  const searchParams = await props.searchParams;
  const path =
    typeof searchParams.path === 'string' ? searchParams.path : undefined;

  return <RepositorySchemaSection initialSelectedPath={path} />;
}
