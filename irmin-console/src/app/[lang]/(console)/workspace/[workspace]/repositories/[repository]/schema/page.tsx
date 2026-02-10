import RepositorySchemaSection from '@/components/repository/RepositorySchemaSection';

import type { PageSearchParams } from '@/types/internal/PageSearchParams';

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
