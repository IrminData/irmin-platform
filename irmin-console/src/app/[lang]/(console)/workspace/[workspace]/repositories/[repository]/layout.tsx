import { Metadata } from 'next';

import { notFound } from 'next/navigation';

import { getBranches } from '@/lib/actions/branches';
import { getRepository } from '@/lib/actions/repositories';
import { getTags } from '@/lib/actions/tags';
import { Locale } from '@/lib/dict';
import { getToken } from '@/lib/getToken';
import { initDict } from '@/lib/initDict';

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
  return {
    title: `Repository ${params.repository} | ${formattedWorkspace} | IRMIN Console`,
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

  const token = await getToken();
  const [repository, branches, tags, { dict }] = await Promise.all([
    getRepository({
      workspace: params.workspace,
      repositorySlug: params.repository,
      token,
    }),
    getBranches({
      workspace: params.workspace,
      repository: params.repository,
      token,
    }),
    getTags({
      workspace: params.workspace,
      repository: params.repository,
      token,
    }),
    initDict(),
  ]);

  if (!repository.data) {
    return notFound();
  }

  return (
    <RepositoryLayoutWrapper
      dict={dict}
      repositorySlug={params.repository}
      workspaceSlug={params.workspace}
      initialRepository={repository.data}
      initialBranches={branches.data ?? []}
      initialTags={tags.data ?? []}
    >
      <QueryProvider>{children}</QueryProvider>
    </RepositoryLayoutWrapper>
  );
}
