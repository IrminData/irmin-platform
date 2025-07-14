import RepositorySchemaSection from '@/components/repository/RepositorySchemaSection';

import type { PageSearchParams } from '@/types/internal/PageSearchParams';

import type { RepositoryRouteParams } from '../layout';

/**
 * Page for the Repository Schema viewer
 *
 * Uses {@link RepositorySchemaSection} to display the Repository Schema
 */
export default async function RepositorySchemaPage(props: {
  params: Promise<RepositoryRouteParams>;
  searchParams: Promise<PageSearchParams>;
}) {
  const searchParams = await props.searchParams;

  const path =
    typeof searchParams.path === 'string' ? searchParams.path : undefined;

  return <RepositorySchemaSection initialSelectedPath={path} />;
}
