import { Metadata } from 'next';

import { notFound } from 'next/navigation';

import { Locale } from '@/dictionaries';

import RepositoryLayoutWrapper from '@/components/repository/RepositoryLayoutWrapper';

import { RepositoryProvider } from '@/context/RepositoryContext';

import { isInvalidRouteProp } from '@/utils/isInvalidRouteProp';

/**
 * Route parameter types for the Repository routes
 * eg. /[lang]/console/[workspace]/repositories/[repository]/whatever
 */
export type RepositoryRouteParams = {
  lang: Locale;
  workspace: string;
  repository: string;
};

/**
 * SEO metadata for the Repository layout
 */
export async function generateMetadata(props: {
  params: Promise<RepositoryRouteParams>;
}): Promise<Metadata> {
  const params = await props.params;
  const formattedWorkspace = params.workspace.replace(/-/g, ' ');
  return {
    title: `Repository ${params.repository} | ${formattedWorkspace} | IRMIN Console`,
  };
}

/**
 * Layout for the Repository pages in the Console.
 * Provides the {@link RepositoryProvider} to use the repository data.
 */
export default async function RepositoryLayoutWithContainer(props: {
  children: React.ReactNode;
  params: Promise<RepositoryRouteParams>;
}) {
  const params = await props.params;

  const { children } = props;

  if (isInvalidRouteProp(params.repository)) {
    notFound();
  }

  return (
    <RepositoryProvider repositorySlug={params.repository}>
      <RepositoryLayoutWrapper>{children}</RepositoryLayoutWrapper>
    </RepositoryProvider>
  );
}
