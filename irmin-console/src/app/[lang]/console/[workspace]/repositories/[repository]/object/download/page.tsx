import { notFound } from 'next/navigation';

import { getObject } from '@/lib/actions/objects';
import { getToken } from '@/lib/getToken';

import RepositoryObjectDownloadSection from '@/components/repository/RepositoryObjectDownloadSection';

import { isInvalidRouteProp } from '@/utils/isInvalidRouteProp';

import { RepositoryRouteParams } from '../../layout';

/**
 * Page to download a repository object from a specific path at a specific ref
 */
export default async function RepositoryObjectDownloadPage(props: {
  params: Promise<RepositoryRouteParams>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  if (
    isInvalidRouteProp(searchParams.path) ||
    isInvalidRouteProp(searchParams.ref)
  ) {
    notFound();
  }

  const token = await getToken();
  const object = await getObject(
    params.repository,
    searchParams.path as string,
    searchParams.ref as string,
    token
  );

  if (!object) {
    notFound();
  }

  return <RepositoryObjectDownloadSection selectedObject={object} />;
}
