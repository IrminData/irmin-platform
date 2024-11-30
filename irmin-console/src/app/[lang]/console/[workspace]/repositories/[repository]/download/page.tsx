import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { RepositoryRouteParams } from '../layout';

/**
 * Page to download a repository or specific objects at a specific ref
 *
 * TODO: Implement the download functionality
 */
export default async function RepositoryDownloadPage(_: {
  params: Promise<RepositoryRouteParams>;
}) {
  return (
    <div className='container relative mx-auto max-w-6xl py-12'>
      <LoadingSkeleton className='h-96' />
    </div>
  );
}
