import type { Metadata } from 'next';

import { notFound } from 'next/navigation';

import type { Locale } from '@/lib/dict';

import AIApplicationLayoutWrapper from '@/components/ai-application/AIApplicationLayoutWrapper';

import { QueryProvider } from '@/context/QueryContext';

import { isInvalidRouteProp } from '@/utils/isInvalidRouteProp';

/**
 * Route parameter types for the AI Application routes
 * eg. /[lang]/workspace/[workspace]/ai-applications/[aiApplication]/whatever
 */
export type AIApplicationRouteParams = {
  lang: Locale;
  workspace: string;
  aiApplication: string;
};

/**
 * SEO metadata for the AI Application layout
 */
export async function generateMetadata(props: {
  params: Promise<AIApplicationRouteParams>;
}): Promise<Metadata> {
  const params = await props.params;
  const formattedWorkspace = params.workspace.replace(/-/g, ' ');
  return {
    title: `AI Application | ${formattedWorkspace} | IRMIN Console`,
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
