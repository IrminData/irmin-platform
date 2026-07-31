import type { Metadata } from 'next';

import { notFound } from 'next/navigation';

import {
  fetchAIApplicationMeta,
  fetchWorkspaceMeta,
} from '@/lib/core/serverFetchers';
import type { Locale } from '@/lib/dict';
import {
  buildTitle,
  buildTitleTemplate,
  clampDescription,
} from '@/lib/metadata';

import AIApplicationLayoutWrapper from '@/components/ai-application/AIApplicationLayoutWrapper';

import { QueryProvider } from '@/context/QueryContext';

import { isInvalidRouteProp } from '@/utils/isInvalidRouteProp';

/**
 * Route parameter types for the AI Application routes
 */
export type AIApplicationRouteParams = {
  lang: Locale;
  workspace: string;
  aiApplication: string;
};

/**
 * AI application layer metadata. Fetches the real application name so
 * subpages (activity, documentation, policies, settings) compose against it.
 */
export async function generateMetadata(props: {
  params: Promise<AIApplicationRouteParams>;
}): Promise<Metadata> {
  const { lang, workspace, aiApplication } = await props.params;
  const [ws, app] = await Promise.all([
    fetchWorkspaceMeta(lang, workspace),
    fetchAIApplicationMeta(lang, workspace, aiApplication),
  ]);
  // Match the workspace layout's ellipsis fallback so composed titles stay
  // visually consistent when either fetch fails.
  const wsName = ws?.name ?? `${workspace}…`;
  const appName = app?.name ?? `${aiApplication.slice(0, 8)}…`;
  return {
    title: {
      default: buildTitle([appName, wsName]),
      template: buildTitleTemplate([appName, wsName]),
    },
    description: clampDescription(
      app?.description,
      `AI application in ${wsName}`
    ),
  };
}

/**
 * Layout for the AI Application pages in the Console.
 */
export default async function AIApplicationLayout(props: {
  children: React.ReactNode;
  params: Promise<AIApplicationRouteParams>;
}) {
  const params = await props.params;

  const { children } = props;

  if (isInvalidRouteProp(params.aiApplication)) {
    notFound();
  }

  return (
    <QueryProvider>
      <AIApplicationLayoutWrapper aiApplicationId={params.aiApplication}>
        {children}
      </AIApplicationLayoutWrapper>
    </QueryProvider>
  );
}
