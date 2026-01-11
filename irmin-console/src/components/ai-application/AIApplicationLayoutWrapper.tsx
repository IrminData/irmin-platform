'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { CommonErrorDisplay } from '@/components/ui/error/CommonErrorDisplay';
import PageSkeleton from '@/components/ui/loading/PageSkeleton';

import { AIApplicationProvider } from '@/context/AIApplicationContext';
import { useLocale } from '@/context/LocaleContext';

import { useAIApplication } from '@/hooks/api/useAIApplications';
import { useBaseUrl, useResourceAllowed } from '@/hooks/utils';

import AIApplicationHeader from './AIApplicationHeader';

/**
 * Component to wrap the AI Application pages in.
 *
 * Uses {@link AIApplicationHeader} to display the header and tabs.
 *
 * @param props - The component properties
 * @param props.children - The children to render
 * @param props.aiApplicationId - The ID of the AI Application to display
 */
export default function AIApplicationLayoutWrapper({
  children,
  aiApplicationId,
}: {
  children: React.ReactNode;
  aiApplicationId: string;
}) {
  const router = useRouter();
  const { dict } = useLocale();
  const { aiApplicationQuery } = useAIApplication(aiApplicationId);
  const { isResourceAllowed, loading: isResourceAllowedLoading } =
    useResourceAllowed();

  // The base URL for the workspace, eg. /en/workspace/workspace-slug
  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'workspace',
    includeSegment: true,
    segmentsAfter: 1,
  });

  // Make sure the user is allowed to access the AI Application
  useEffect(() => {
    if (isResourceAllowedLoading || aiApplicationQuery.isLoading) return;
    // Don't run permission check if query failed or returned no data
    // Let the error/404 handling below display the appropriate message
    if (aiApplicationQuery.isError || !aiApplicationQuery.data?.data) return;
    if (
      !isResourceAllowed(
        'ai_application',
        'read',
        aiApplicationQuery.data.data.id
      )
    ) {
      // Redirect to the workspace AI applications page if the user is not allowed
      router.push(`${workspaceUrl}/ai-applications`);
    }
  }, [
    isResourceAllowed,
    isResourceAllowedLoading,
    aiApplicationQuery.isLoading,
    aiApplicationQuery.isError,
    aiApplicationQuery.data?.data,
    workspaceUrl,
    router,
  ]);

  if (aiApplicationQuery.isLoading || isResourceAllowedLoading)
    return (
      <div
        className={`
          relative container mx-auto max-w-7xl px-2
          md:px-4
        `}
      >
        <PageSkeleton showHeader={true} contentRows={3} className='py-4' />
      </div>
    );

  if (aiApplicationQuery.isError) {
    return (
      <CommonErrorDisplay
        error={aiApplicationQuery.error}
        variant='page'
        showReload={true}
        onRetry={() => aiApplicationQuery.refetch()}
        title={dict.common.error}
        description={dict.common.weEncounteredError}
      />
    );
  }

  if (!aiApplicationQuery.data?.data) {
    return (
      <CommonErrorDisplay
        variant='page'
        showHome={true}
        title={`AI Application ${dict.common.pageNotFound.toLowerCase()}`}
        description={dict.common.tryAgainOrContactSupport}
      />
    );
  }

  return (
    <AIApplicationProvider aiApplication={aiApplicationQuery.data.data}>
      <AIApplicationHeader />
      <div>{children}</div>
    </AIApplicationProvider>
  );
}
