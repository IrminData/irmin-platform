import RepositoryObjectHistorySection from '@/components/repository/RepositoryObjectHistorySection';

/**
 * Page to view a repository object from a specific path at a specific ref
 */
export default async function RepositoryObjectHistoryPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const path = (searchParams.path as string) ?? '';

  return <RepositoryObjectHistorySection path={path} />;
}
