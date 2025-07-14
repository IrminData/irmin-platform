'use client';

import { useMemo } from 'react';

import { TbArrowLeft } from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import { ContentWrapper } from '@/components/ui/ContentWrapper';
import PolicyEditor from '@/components/ui/policy-editor';

import { useLocale } from '@/context/LocaleContext';

import useBaseUrl from '@/hooks/useBaseUrl';
import { usePolicies } from '@/hooks/usePolicies';

import { PolicyResource } from '@/types/core/Policy';

/**
 * Query Policies section
 *
 * This component is used to display the list of policies for the query.
 */
const QueryPoliciesSection = ({ queryID }: { queryID?: string }) => {
  const { dict } = useLocale();
  const { policiesQuery } = usePolicies({
    resource: PolicyResource.Query,
  });
  // Filter policies to only include policies for this query or global query policies
  const filteredPolicies = useMemo(() => {
    return (
      policiesQuery.data?.data?.filter(
        (policy) =>
          !policy.resourceId || (queryID && policy.resourceId === queryID)
      ) ?? []
    );
  }, [policiesQuery.data?.data, queryID]);

  // The base URL for the workspace, eg. /en/workspace/workspace-slug
  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'workspace',
    includeSegment: true,
    segmentsAfter: 1,
  });

  return (
    <ContentWrapper className='mt-4'>
      <div className='flex flex-col gap-4 p-4'>
        <Button
          variant='secondary'
          size='sm'
          href={`${workspaceUrl}/queries`}
          icon={<TbArrowLeft />}
        >
          {dict.common.back}
        </Button>
      </div>
      <PolicyEditor
        policies={filteredPolicies}
        policiesLoading={policiesQuery.isLoading}
        policiesError={policiesQuery.error}
        title={dict.policy.title}
        description={dict.policy.description}
        defaultResourceType={PolicyResource.Query}
        defaultResourceId={queryID}
        showResourceColumn={true}
        showResourceIdColumn={true}
        allowCreate={true}
        allowEdit={true}
        allowDelete={true}
      />
    </ContentWrapper>
  );
};

export default QueryPoliciesSection;
