'use client';

import { useMemo } from 'react';

import { ContentWrapper } from '@/components/ui/ContentWrapper';
import SafeComponent from '@/components/ui/error/SafeComponent';
import PolicyEditor from '@/components/ui/policy-editor';

import { useAIApplicationContext } from '@/context/AIApplicationContext';
import { useLocale } from '@/context/LocaleContext';

import { usePolicies } from '@/hooks/api';

/**
 * AI Application Policies section
 *
 * This component is used to display the list of policies for the AI Application.
 * It allows one to manage the policies and create new ones.
 */
const AIApplicationPoliciesSection = () => {
  return (
    <SafeComponent
      level='section'
      titleKey='policiesTitle'
      descriptionKey='policiesDescription'
    >
      <AIApplicationPoliciesSectionContent />
    </SafeComponent>
  );
};

const AIApplicationPoliciesSectionContent = () => {
  const { dict } = useLocale();
  const { aiApplication } = useAIApplicationContext();

  const { policiesQuery } = usePolicies({
    resource: 'ai_application',
  });

  // Filter policies to only include policies for this AI Application or global AI Application policies
  const filteredPolicies = useMemo(() => {
    return (
      policiesQuery.data?.data?.filter(
        (policy) => !policy.resourceId || policy.resourceId === aiApplication.id
      ) ?? []
    );
  }, [policiesQuery.data?.data, aiApplication.id]);

  return (
    <ContentWrapper className='mt-4'>
      <PolicyEditor
        policies={filteredPolicies}
        policiesLoading={policiesQuery.isLoading}
        policiesError={policiesQuery.error}
        title={dict.policy.title}
        description={dict.policy.description}
        defaultResourceType='ai_application'
        defaultResourceId={aiApplication.id}
        showResourceColumn={true}
        showResourceIdColumn={true}
        allowCreate={true}
        allowEdit={true}
        allowDelete={true}
      />
    </ContentWrapper>
  );
};

export default AIApplicationPoliciesSection;
