import { notFound } from 'next/navigation';

import { Locale } from '@/dictionaries';

import { isInvalidRouteProp } from '@/utils/isInvalidRouteProp';

/**
 * Route parameter types for the Repository ref routes
 * eg. /[lang]/console/[workspace]/repositories/[repository]/refs/[ref]
 * @param lang - The language of the user
 * @param workspace - The workspace slug
 * @param repository - The repository slug
 * @param ref - The repository ref (branch, tag, commit)
 */
export type RepositoryRefRouteParams = {
  lang: Locale;
  workspace: string;
  repository: string;
  ref: string;
};

/**
 * Layout for the Repository ref pages in the Console eg. tag, commit, branch
 * @param props0 - The layout properties
 * @param props0.params - The layout parameters from Next JS router
 * @param props0.children - The children to render
 */
export default function RepositoryRefLayoutWithContainer({
  children,
  params,
}: {
  children: React.ReactNode;
  params: RepositoryRefRouteParams;
}) {
  if (isInvalidRouteProp(params.repository) || isInvalidRouteProp(params.ref)) {
    notFound();
  }

  return children;
}
