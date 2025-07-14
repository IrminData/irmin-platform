'use client';

import { useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { ContentWrapper } from '@/components/ui/ContentWrapper';
import SafeComponent from '@/components/ui/error/SafeComponent';
import PolicyEditor from '@/components/ui/policy-editor';

import { useLocale } from '@/context/LocaleContext';
import { useRepositoryContext } from '@/context/RepositoryContext';

import useBaseUrl from '@/hooks/useBaseUrl';
import { usePolicies } from '@/hooks/usePolicies';

import { PolicyResource } from '@/types/core/Policy';

/**
 * Repository Policies section
 *
 * This component is used to display the list of policies for the repository.
 * It allows one to manage the policies and create new ones.
 */
const RepositoryPoliciesSection = ({ type }: { type?: PolicyResource }) => {
  return (
    <SafeComponent
      level='section'
      title='Repository Policies Error'
      description='The repository policies section encountered an error. Please try refreshing the page.'
    >
      <RepositoryPoliciesSectionContent type={type} />
    </SafeComponent>
  );
};

const RepositoryPoliciesSectionContent = ({
  type,
}: {
  type?: PolicyResource;
}) => {
  const { dict } = useLocale();
  const { repository } = useRepositoryContext();

  const { policiesQuery } = usePolicies({
    resource: type ?? PolicyResource.Repository,
  });

  /** The base URL for the repository, eg. /en/workspace/workspace-slug/repositories/repository-slug */
  const baseUrl = useBaseUrl({
    pathname: '',
    segment: 'repositories',
    includeSegment: true,
    segmentsAfter: 1,
  });

  // Filter policies to only include policies for this repository or global repository policies
  const filteredPolicies = useMemo(() => {
    return (
      policiesQuery.data?.data?.filter(
        (policy) => !policy.resourceId || policy.resourceId === repository.id
      ) ?? []
    );
  }, [policiesQuery.data?.data, repository.id]);

  return (
    <div className='flex flex-col'>
      <div className='mx-auto flex w-full max-w-7xl px-2'>
        <div className='flex w-full flex-wrap items-center gap-2'>
          <Button
            variant={type === PolicyResource.Repository ? 'gray' : 'ghost'}
            href={`${baseUrl}/policies`}
          >
            {dict.repository.repository}
          </Button>
          <Button
            variant={
              type === PolicyResource.RepositoryBranch ? 'gray' : 'ghost'
            }
            href={`${baseUrl}/policies/branches`}
          >
            {dict.repository.branches.branches}
          </Button>
          <Button
            variant={type === PolicyResource.RepositoryTag ? 'gray' : 'ghost'}
            href={`${baseUrl}/policies/tags`}
          >
            {dict.repository.tags.tags}
          </Button>
          <Button
            variant={
              type === PolicyResource.RepositoryObject ? 'gray' : 'ghost'
            }
            href={`${baseUrl}/policies/objects`}
          >
            {dict.repository.objects.objects}
          </Button>
          <Button
            variant={
              type === PolicyResource.RepositoryCommit ? 'gray' : 'ghost'
            }
            href={`${baseUrl}/policies/commits`}
          >
            {dict.repository.commit.commits}
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
          defaultResourceType={type ?? PolicyResource.Repository}
          defaultResourceId={repository.id}
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

export default RepositoryPoliciesSection;
