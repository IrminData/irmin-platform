import { notFound } from 'next/navigation';

import { getObject } from '@/lib/actions/repositories';
import { getToken } from '@/lib/getToken';

import RepositoryObjectSchemaSection from '@/components/repository/RepositoryObjectSchemaSection';

import { RepositoryRouteParams } from '../../layout';

/**
 * Page to view a repository object's schema from a specific path at a specific ref
 */
export default async function RepositoryObjectSchemaPage(props: {
  params: Promise<RepositoryRouteParams>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  const ref =
    typeof searchParams.ref === 'string' && searchParams.ref.length > 0
      ? searchParams.ref
      : undefined;
  const path =
    typeof searchParams.path === 'string' ? searchParams.path : undefined;

  if (!path) return notFound();

  const token = await getToken();
  const object = await getObject({
    workspace: params.workspace,
    repository: params.repository,
    path,
    ref,
    token,
  });

  if (!object.data) {
    notFound();
  }

  return (
    <RepositoryObjectSchemaSection
      currentWorkspace={params.workspace}
      selectedObject={object.data}
    />
  );
}
