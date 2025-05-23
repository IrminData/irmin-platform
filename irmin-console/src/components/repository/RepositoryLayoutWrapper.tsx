'use client';

import { RepositoryProvider } from '@/context/RepositoryContext';

import { useRepository } from '@/hooks/useRepository';

import LoadingSkeleton from '../ui/loading/LoadingSkeleton';
import RepositoryHeader from './RepositoryHeader';

/**
 * Component to wrap the Repository pages in.
 *
 * Uses {@link RepositoryHeader} to display the header and tabs.
 *
 * @param props - The component properties
 * @param props.children - The children to render
 * @param props.repositorySlug - The slug of the repository to display
 */
export default function RepositoryLayoutWrapper({
  children,
  repositorySlug,
}: {
  children: React.ReactNode;
  repositorySlug: string;
}) {
  const { repositoryQuery } = useRepository(repositorySlug);

  if (repositoryQuery.isLoading) {
    return <LoadingSkeleton className='h-80 w-full' />;
  }

  if (!repositoryQuery.data?.data) {
    return <div>Repository not found</div>;
  }

  return (
    <RepositoryProvider repository={repositoryQuery.data?.data}>
      <RepositoryHeader />
      <div>{children}</div>
    </RepositoryProvider>
  );
}
