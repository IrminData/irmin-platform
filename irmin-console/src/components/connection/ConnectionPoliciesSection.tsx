'use client';

import { useMemo } from 'react';

import { ContentWrapper } from '@/components/ui/ContentWrapper';
import PolicyEditor from '@/components/ui/policy-editor';

import { useLocale } from '@/context/LocaleContext';

import { usePolicies } from '@/hooks/usePolicies';

import { PolicyResource } from '@/types/core/Policy';

/**
 * Connection Policies section
 *
 * This component is used to display the list of policies for the connection.
 * It allows one to manage the policies and create new ones.
 */
const ConnectionPoliciesSection = ({
  connectionID,
}: {
  connectionID: string;
}) => {
  const { dict } = useLocale();

  const { policiesQuery } = usePolicies({
    resource: PolicyResource.Connection,
  });

  // Filter policies to only include policies for this connection or global connection policies
  const filteredPolicies = useMemo(() => {
    return (
      policiesQuery.data?.data?.filter(
        (policy) => !policy.resourceId || policy.resourceId === connectionID
      ) ?? []
    );
  }, [policiesQuery.data?.data, connectionID]);

  return (
    <ContentWrapper className='mt-4'>
      <PolicyEditor
        policies={filteredPolicies}
        policiesLoading={policiesQuery.isLoading}
        policiesError={policiesQuery.error}
        title={dict.policy.title}
        description={dict.policy.description}
        defaultResourceType={PolicyResource.Connection}
        defaultResourceId={connectionID}
        showResourceColumn={true}
        showResourceIdColumn={true}
        allowCreate={true}
        allowEdit={true}
        allowDelete={true}
      />
    </ContentWrapper>
  );
};

export default ConnectionPoliciesSection;
