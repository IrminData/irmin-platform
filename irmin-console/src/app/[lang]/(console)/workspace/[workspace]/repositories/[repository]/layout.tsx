import type { Metadata } from 'next';

import { notFound } from 'next/navigation';

import type { Locale } from '@/lib/dict';

import RepositoryLayoutWrapper from '@/components/repository/RepositoryLayoutWrapper';

import { QueryProvider } from '@/context/QueryContext';

import { isInvalidRouteProp } from '@/utils/isInvalidRouteProp';

/**
 * Route parameter types for the Repository routes
 * eg. /[lang]/workspace/[workspace]/repositories/[repository]/whatever
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
  const repositorySlug = params.repository;
  return {
    title: `${repositorySlug} | ${formattedWorkspace} | IRMIN Console`,
  };
}

/**
 * Layout for the Repository pages in the Console.
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
    <RepositoryLayoutWrapper repositorySlug={params.repository}>
      <QueryProvider>{children}</QueryProvider>
    </RepositoryLayoutWrapper>
  );
}
