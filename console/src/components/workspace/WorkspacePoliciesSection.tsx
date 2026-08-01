'use client';

import { useState } from 'react';

import { TbChevronDown, TbChevronRight } from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ContentWrapper } from '@/components/ui/ContentWrapper';
import PolicyEditor from '@/components/ui/policy-editor';
import RolePermissionOverview from '@/components/ui/policy-editor/RolePermissionOverview';
import UserPermissionOverview from '@/components/ui/policy-editor/UserPermissionOverview';

import { useLocale } from '@/context/LocaleContext';

import { usePolicies } from '@/hooks/api';

/**
 * Workspace Policies section
 *
 * This component is used to display the list of policies for the workspace.
 * It allows one to manage the policies and create new ones.
 */
const WorkspacePoliciesSection = () => {
  const { dict } = useLocale();
  const { policiesQuery } = usePolicies({});
  const [roleOpen, setRoleOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  return (
    <ContentWrapper>
      <div className='flex flex-col gap-4 p-4'>
        <Collapsible open={roleOpen} onOpenChange={setRoleOpen}>
          <CollapsibleTrigger asChild>
            <Button variant='ghost' className='w-full justify-start gap-2'>
              {roleOpen ? (
                <TbChevronDown className='size-4' />
              ) : (
                <TbChevronRight className='size-4' />
              )}
              <span className='font-semibold'>
                {dict.policy.permissionOverview.rolePermissions}
              </span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className='px-2 pt-2'>
            <RolePermissionOverview />
          </CollapsibleContent>
        </Collapsible>

        <Collapsible open={userOpen} onOpenChange={setUserOpen}>
          <CollapsibleTrigger asChild>
            <Button variant='ghost' className='w-full justify-start gap-2'>
              {userOpen ? (
                <TbChevronDown className='size-4' />
              ) : (
                <TbChevronRight className='size-4' />
              )}
              <span className='font-semibold'>
                {dict.policy.permissionOverview.userPermissions}
              </span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className='px-2 pt-2'>
            <UserPermissionOverview />
          </CollapsibleContent>
        </Collapsible>
      </div>

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
