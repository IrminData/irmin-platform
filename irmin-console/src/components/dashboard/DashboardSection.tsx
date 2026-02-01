'use client';

import {
  TbCode,
  TbInvoice,
  TbLogs,
  TbMail,
  TbSchema,
  TbSettings,
  TbTag,
  TbUser,
  TbUsersGroup,
} from 'react-icons/tb';

import AssistantSection from '@/components/assistant/AssistantSection';
import { Button } from '@/components/ui/button';
import { QueryError } from '@/components/ui/error/QueryError';
import WorkspaceDashboardSkeleton from '@/components/ui/loading/WorkspaceDashboardSkeleton';
import WizardSelector from '@/components/wizards/WizardSelector';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { useAIApplications } from '@/hooks/api';
import { useConnections } from '@/hooks/api/useConnections';
import { useRepositories } from '@/hooks/api/useRepositories';
import { useWorkflows } from '@/hooks/api/useWorkflows';
import { useBaseUrl, useResourceAllowed } from '@/hooks/utils';

import { DashboardListCard } from './DashboardListCard';
import { DashboardWorkflowRunsFeed } from './DashboardWorkflowRunsFeed';

/**
 * Dashboard section for the workspace.
 */
const DashboardSection = () => {
  const { dict, locale } = useLocale();
  const { workspaceQuery } = useWorkspaceContext();

  const { isResourceAllowed, loading: isResourceAllowedLoading } =
    useResourceAllowed();

  const { repositoriesQuery } = useRepositories();
  const { workflowsQuery } = useWorkflows();
  const { connectionsQuery } = useConnections();
  const { aiApplicationsQuery } = useAIApplications();

  // The base URL for the workspace, eg. /en/workspace/workspace-slug
  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'workspace',
    includeSegment: true,
    segmentsAfter: 1,
  });

  if (workspaceQuery?.isError) {
    return (
      <div className='pattern-bg h-full py-12'>
        <div className='relative container mx-auto max-w-6xl px-4'>
          <QueryError
            error={workspaceQuery.error}
            onRetry={() => workspaceQuery.refetch()}
            title={dict.common.somethingWentWrong}
          />
        </div>
      </div>
    );
  }

  if (isResourceAllowedLoading) {
    return <WorkspaceDashboardSkeleton />;
  }

  return (
    <div className='pattern-bg h-full py-4'>
      <div
        className={`
          relative container mx-auto w-full max-w-7xl
          lg:px-4
        `}
      >
        <div className='flex flex-col gap-4 px-4 pb-12'>
          {/* Navigation Buttons */}
          <div className='flex flex-row gap-2'>
            <Button
              href={`${locale}/profile`}
              variant='gray'
              size='sm'
              icon={<TbUser className='size-4' />}
            >
              {dict.consoleNavigation.myProfile}
            </Button>
            {isResourceAllowed('workspace', 'read') && (
              <Button
                href={`${workspaceUrl}/settings`}
                variant='gray'
                size='sm'
                icon={<TbSettings className='size-4' />}
              >
                {dict.consoleNavigation.settings}
              </Button>
            )}
            {isResourceAllowed('workspace_tag', 'read') && (
              <Button
                href={`${workspaceUrl}/settings/tags`}
                variant='gray'
                size='sm'
                icon={<TbTag className='size-4' />}
              >
                {dict.workspace.tags}
              </Button>
            )}
            {isResourceAllowed('user', 'read') && (
              <Button
                href={`${workspaceUrl}/settings/users`}
                variant='gray'
                size='sm'
                icon={<TbUsersGroup className='size-4' />}
              >
                {dict.workspace.users}
              </Button>
            )}
            {isResourceAllowed('invite', 'read') && (
              <Button
                href={`${workspaceUrl}/settings/invites`}
                variant='gray'
                size='sm'
                icon={<TbMail className='size-4' />}
              >
                {dict.workspace.invites}
              </Button>
            )}
            {isResourceAllowed('billing', 'read') && (
              <Button
                href={`${workspaceUrl}/settings/billing`}
                variant='gray'
                size='sm'
                icon={<TbInvoice className='size-4' />}
              >
                {dict.workspace.billing}
              </Button>
            )}
            {isResourceAllowed('audit_log', 'read') && (
              <Button
                href={`${workspaceUrl}/logs`}
                variant='gray'
                size='sm'
                icon={<TbLogs className='size-4' />}
              >
                {dict.common.logs}
              </Button>
            )}
            {isResourceAllowed('documentation', 'read') && (
              <Button
                href={`${workspaceUrl}/documentation`}
                variant='gray'
                size='sm'
                icon={<TbSchema className='size-4' />}
              >
                {dict.documentation.documentation}
              </Button>
            )}
            <Button
              href={`${workspaceUrl}/settings/api-mcp`}
              variant='gray'
              size='sm'
              icon={<TbCode className='size-4' />}
            >
              {dict.workspace.apiMcp}
            </Button>
          </div>
          {/* AI Assistant and Workflow Runs */}
          <div
            className={`
              flex flex-col gap-4
              lg:max-h-[550px] lg:flex-row
            `}
          >
            <div className={`w-full overflow-hidden rounded-xl border`}>
              <AssistantSection
                compact={true}
                noBorder={true}
                showContextBanner={false}
              />
            </div>
            <div className='flex w-full max-w-md flex-col overflow-hidden'>
              {isResourceAllowed('workflow_run', 'read') && (
                <DashboardWorkflowRunsFeed workspaceUrl={workspaceUrl} />
              )}
            </div>
          </div>
          {/* Wizard Selector */}
          <div
            className={`flex w-full flex-row items-stretch justify-start gap-2`}
          >
            <WizardSelector
              availableWizards={['data-import', 'data-export', 'pipeline']}
            />
          </div>
          {/* List cards */}
          <div
            className={`
              grid grid-cols-1 gap-4
              md:grid-cols-2
              xl:grid-cols-4
            `}
          >
            {isResourceAllowed('repository', 'read') && (
              <DashboardListCard
                title={dict.repository.repositories}
                type='repositories'
                loading={repositoriesQuery.isLoading}
                items={repositoriesQuery.data?.data?.slice(0, 5) || []}
                viewAllHref={`${workspaceUrl}/repositories`}
                createNewHref={`${workspaceUrl}/repositories?create`}
                workspaceUrl={workspaceUrl}
                emptyStateTitle={dict.list.emptyState.repositories.title}
                emptyStateDescription={
                  dict.list.emptyState.repositories.description
                }
                emptyStateAction={{
                  label: dict.repository.createNewRepository,
                  href: `${workspaceUrl}/repositories?create`,
                  variant: 'gradient',
                }}
                hideCreateNewButton={!isResourceAllowed('repository', 'create')}
              />
            )}
            {isResourceAllowed('connection', 'read') && (
              <DashboardListCard
                title={dict.connections.connections}
                type='connections'
                loading={connectionsQuery.isLoading}
                items={connectionsQuery.data?.data?.slice(0, 5) || []}
                viewAllHref={`${workspaceUrl}/connections`}
                createNewHref={`${workspaceUrl}/connections?create`}
                workspaceUrl={workspaceUrl}
                emptyStateTitle={dict.list.emptyState.connections.title}
                emptyStateDescription={
                  dict.list.emptyState.connections.description
                }
                emptyStateAction={{
                  label: dict.connections.create.createNewConnection,
                  href: `${workspaceUrl}/connections?create`,
                  variant: 'gradient',
                }}
                hideCreateNewButton={!isResourceAllowed('connection', 'create')}
              />
            )}
            {isResourceAllowed('workflow', 'read') && (
              <DashboardListCard
                title={dict.workflow.workflows}
                type='workflows'
                loading={workflowsQuery.isLoading}
                items={workflowsQuery.data?.data?.slice(0, 5) || []}
                viewAllHref={`${workspaceUrl}/workflows`}
                createNewHref={`${workspaceUrl}/workflows?create`}
                workspaceUrl={workspaceUrl}
                emptyStateTitle={dict.list.emptyState.workflows.title}
                emptyStateDescription={
                  dict.list.emptyState.workflows.description
                }
                emptyStateAction={{
                  label: dict.workflow.create.createNewWorkflow,
                  href: `${workspaceUrl}/workflows?create`,
                  variant: 'gradient',
                }}
                hideCreateNewButton={!isResourceAllowed('workflow', 'create')}
              />
            )}
            {isResourceAllowed('ai_application', 'read') && (
              <DashboardListCard
                title={dict.consoleNavigation.aiApplications}
                type='ai-applications'
                loading={aiApplicationsQuery.isLoading}
                items={aiApplicationsQuery.data?.data?.slice(0, 5) || []}
                viewAllHref={`${workspaceUrl}/ai-applications`}
                createNewHref={`${workspaceUrl}/ai-applications?create`}
                workspaceUrl={workspaceUrl}
                emptyStateTitle={dict.list.emptyState.aiApplications.title}
                emptyStateDescription={
                  dict.list.emptyState.aiApplications.description
                }
                emptyStateAction={{
                  label: dict.aiApplication.createAIApplication,
                  href: `${workspaceUrl}/ai-applications?create`,
                  variant: 'gradient',
                }}
                hideCreateNewButton={
                  !isResourceAllowed('ai_application', 'create')
                }
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardSection;
