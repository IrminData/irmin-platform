import { Metadata } from 'next';

import { notFound } from 'next/navigation';

import {
  getBranches,
  getCommits,
  getRepository,
  getTags,
} from '@/lib/actions/repositories';
import { Locale } from '@/lib/dict';
import { getToken } from '@/lib/getToken';

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
  try {
    const { data: repository } = await getRepository({
      workspace: params.workspace,
      repositorySlug,
    });
    if (!repository) throw new Error('Repository not found');
    return {
      title: `${repository.name} | Repository | ${formattedWorkspace} | IRMIN Console`,
    };
  } catch (error) {
    console.warn(error);
    return {
      title: `Repository | ${formattedWorkspace} | IRMIN Console`,
    };
  }
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

  const token = await getToken();
  const [repository, branches, tags, commits] = await Promise.all([
    getRepository({
      workspace: params.workspace,
      repositorySlug: params.repository,
      token,
    }),
    getBranches({
      workspace: params.workspace,
      repository: params.repository,
      token,
    }).catch(() => ({ data: [] })),
    getTags({
      workspace: params.workspace,
      repository: params.repository,
      token,
    }).catch(() => ({ data: [] })),
    getCommits({
      workspace: params.workspace,
      repository: params.repository,
      token,
    }).catch(() => ({ data: [] })),
  ]);

  if (!repository.data) {
    return notFound();
  }

  return (
    <RepositoryLayoutWrapper
      repositorySlug={params.repository}
      initialRepository={repository.data}
      initialBranches={branches.data ?? []}
      initialTags={tags.data ?? []}
      initialCommits={commits.data ?? []}
    >
      <QueryProvider>{children}</QueryProvider>
    </RepositoryLayoutWrapper>
  );
}
