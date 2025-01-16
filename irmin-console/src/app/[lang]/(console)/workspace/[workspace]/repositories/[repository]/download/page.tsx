import RepositoryDownloadSection from '@/components/repository/RepositoryDownloadSection';

import { RepositoryRouteParams } from '../layout';

/**
 * Page to download a repository or specific path as zip at a specific ref
 */
export default async function RepositoryDownloadPage(props: {
  params: Promise<RepositoryRouteParams>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  return (
    <RepositoryDownloadSection
      selectedPath={
        searchParams.path && typeof searchParams.path === 'string'
          ? searchParams.path
          : undefined
      }
    />
  );
}
