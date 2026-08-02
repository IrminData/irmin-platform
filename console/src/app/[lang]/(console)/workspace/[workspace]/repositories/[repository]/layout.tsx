import type { Metadata } from 'next';

import { notFound } from 'next/navigation';

import {
  fetchRepositoryMeta,
  fetchWorkspaceMeta,
} from '@/lib/core/serverFetchers';
import type { Locale } from '@/lib/dict';
import {
  buildTitle,
  buildTitleTemplate,
  clampDescription,
} from '@/lib/metadata';

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
 * Repository layer metadata. Fetches the real repository name so deeper
 * subpages (schema, branches, commits, …) compose titles against the
 * actual name rather than the URL slug.
 */
export async function generateMetadata(props: {
  params: Promise<RepositoryRouteParams>;
}): Promise<Metadata> {
  const { lang, workspace, repository } = await props.params;
  const [ws, repo] = await Promise.all([
    fetchWorkspaceMeta(lang, workspace),
    fetchRepositoryMeta(lang, workspace, repository),
  ]);
  // Match the workspace layout's ellipsis fallback so composed titles stay
  // visually consistent when either fetch fails.
  const wsName = ws?.name ?? `${workspace}…`;
  const repoName = repo?.name ?? `${repository}…`;
  return {
    title: {
      default: buildTitle([repoName, wsName]),
      template: buildTitleTemplate([repoName, wsName]),
    },
    description: clampDescription(repo?.description, `Repository in ${wsName}`),
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
