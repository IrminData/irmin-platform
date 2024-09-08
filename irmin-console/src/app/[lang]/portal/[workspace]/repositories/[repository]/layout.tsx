import { Metadata } from 'next';

import { Locale } from '@/dictionaries';

import RepositoryLayoutWrapper from '@/components/repository/RepositoryLayoutWrapper';

/**
 * Route parameter types for the Repository routes
 * eg. /[lang]/portal/[workspace]/repositories/[repository]/whatever
 * @param lang - The language of the user
 * @param workspace - The workspace slug
 * @param repository - The repository slug
 */
export type RepositoryRouteParams = {
  lang: Locale;
  workspace: string;
  repository: string;
};

/**
 * SEO metadata for the Repository layout
 */
export async function generateMetadata({
  params,
}: {
  params: RepositoryRouteParams;
}): Promise<Metadata> {
  const formattedWorkspace = params.workspace.replace(/-/g, ' ');
  return {
    title: `${params.repository} | ${formattedWorkspace} | IRMIN Portal`,
  };
}

/**
 * Layout for the Repository pages in the Portal (with container)
 * @param props0 - The layout properties
 * @param props0.params - The layout parameters from Next JS router
 * @param props0.children - The children to render
 */
export default function RepositoryLayoutWithContainer({
  children,
  params,
}: {
  children: React.ReactNode;
  params: RepositoryRouteParams;
}) {
  return (
    <RepositoryLayoutWrapper repoSlug={params.repository}>
      {children}
    </RepositoryLayoutWrapper>
  );
}
