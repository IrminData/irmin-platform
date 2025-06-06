'use client';

import ContentWrapper from '@/components/ui/ContentWrapper';
import PolicyEditor from '@/components/ui/policy-editor';

import { useLocale } from '@/context/LocaleContext';

import { usePolicies } from '@/hooks/usePolicies';

/**
 * Workspace Policies section
 *
 * This component is used to display the list of policies for the workspace.
 * It allows one to manage the policies and create new ones.
 */
const WorkspacePoliciesSection = () => {
  const { dict } = useLocale();
  const { policiesQuery } = usePolicies({});

  return (
    <ContentWrapper>
      <PolicyEditor
        policies={policiesQuery.data?.data ?? []}
        policiesLoading={policiesQuery.isLoading}
        policiesError={policiesQuery.error}
        title={dict.policy.title}
        description={dict.policy.description}
        showResourceColumn={true}
        showResourceIdColumn={true}
        allowCreate={true}
        allowEdit={true}
        allowDelete={true}
      />
    </ContentWrapper>
  );
};

export default WorkspacePoliciesSection;
