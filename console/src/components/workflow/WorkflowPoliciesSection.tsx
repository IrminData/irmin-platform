'use client';

import { useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { ContentWrapper } from '@/components/ui/ContentWrapper';
import PolicyEditor from '@/components/ui/policy-editor';

import { useLocale } from '@/context/LocaleContext';

import { usePolicies } from '@/hooks/api';
import { useBaseUrl } from '@/hooks/utils';

/**
 * Workflow Policies section
 *
 * This component is used to display the list of policies for the workflow.
 * It allows one to manage the policies and create new ones.
 */
const WorkflowPoliciesSection = ({
  workflowID,
  type,
}: {
  workflowID: string;
  type?: 'workflow' | 'workflow_run';
}) => {
  const { dict } = useLocale();

  const { policiesQuery } = usePolicies({
    resource: type ?? 'workflow',
  });

  // The base URL for the workflow, eg. /en/workspace/workspace-slug/workflows/workflow-id
  const baseUrl = useBaseUrl({
    pathname: '',
    segment: 'workflows',
    includeSegment: true,
    segmentsAfter: 1,
  });

  // Filter policies to only include policies for this workflow or global workflow policies
  const filteredPolicies = useMemo(() => {
    return (
      policiesQuery.data?.data?.filter(
        (policy) => !policy.resourceId || policy.resourceId === workflowID
      ) ?? []
    );
  }, [policiesQuery.data?.data, workflowID]);

  return (
    <div className='flex flex-col'>
      <div className='mx-auto flex w-full max-w-7xl px-2'>
        <div className='flex w-full flex-wrap items-center gap-2'>
          <Button
            variant={type === 'workflow' ? 'gray' : 'ghost'}
            href={`${baseUrl}/policies`}
          >
            {dict.workflow.workflow}
          </Button>
          <Button
            variant={type === 'workflow_run' ? 'gray' : 'ghost'}
            href={`${baseUrl}/policies/runs`}
          >
            {dict.workflow.run}
          </Button>
        </div>
      </div>
      <ContentWrapper className='mt-4'>
        <PolicyEditor
          policies={filteredPolicies}
          policiesLoading={policiesQuery.isLoading}
          policiesError={policiesQuery.error}
          title={dict.policy.title}
          description={dict.policy.description}
          defaultResourceType={type ?? 'workflow'}
          defaultResourceId={workflowID}
          showResourceColumn={true}
          showResourceIdColumn={true}
          allowCreate={true}
          allowEdit={true}
          allowDelete={true}
        />
      </ContentWrapper>
    </div>
  );
};

export default WorkflowPoliciesSection;
