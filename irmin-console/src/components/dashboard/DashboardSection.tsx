'use client';

import type { ReactNode } from 'react';

import { clientEnv } from '@/config/env.client';

import {
  TbChevronDown,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { QueryError } from '@/components/ui/error/QueryError';
import WorkspaceDashboardSkeleton from '@/components/ui/loading/WorkspaceDashboardSkeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import WizardSelector from '@/components/wizards/WizardSelector';
import BillingBanner from '@/components/workspace/billing/BillingBanner';

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
 * Wraps a dashboard nav button with a tooltip that explains what it opens.
 * Tooltips are short and specific — "Workspace configuration and defaults."
 * is more useful than the label "Settings" alone, especially for the
 * Catalog & Lineage button whose name doesn't self-explain.
 */
function NavButtonWithTooltip({
  href,
  icon,
  label,
  tooltip,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  tooltip: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button href={href} variant='gray' size='sm' icon={icon}>
          {label}
        </Button>
      </TooltipTrigger>
      <TooltipContent side='bottom'>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

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
      <div className='min-h-full py-12'>
        <div className='relative container mx-auto max-w-6xl px-4'>
          <QueryError
            error={workspaceQuery.error}
            onRetry={() => workspaceQuery.refetch()}
            title={dict.common.errors.failedToLoadWorkspace}
            description={dict.common.errors.failedToLoadAgain}
          />
        </div>
      </div>
    );
  }

  if (isResourceAllowedLoading) {
    return <WorkspaceDashboardSkeleton />;
  }

  return (
    <div className='min-h-full py-4'>
      <div
        className={`
          relative container mx-auto w-full max-w-7xl
          lg:px-4
        `}
      >
        <div className='flex flex-col gap-4 px-4 pb-12'>
          {/* Workspace navigation.
              Primary group (4 chips): My Profile, Settings, Logs, Catalog
              & Lineage — the four surfaces the workspace owner hits
              most. Everything else (Users, Invites, Tags, Billing,
              API/MCP) sits under a "More" dropdown to keep the first-
              scan cognitive load low. Nine equal-weight chips in a row
              was reading as noise. */}
          <TooltipProvider delayDuration={300}>
            <div className='flex flex-row flex-wrap items-center gap-2'>
              <NavButtonWithTooltip
                href={`/${locale}/profile`}
                icon={<TbUser className='size-4' />}
                label={dict.consoleNavigation.myProfile}
                tooltip={dict.workspace.dashboardTooltips.profile}
              />
              {isResourceAllowed('workspace', 'read') && (
                <NavButtonWithTooltip
                  href={`${workspaceUrl}/settings`}
                  icon={<TbSettings className='size-4' />}
                  label={dict.consoleNavigation.settings}
                  tooltip={dict.workspace.dashboardTooltips.settings}
                />
              )}
              {isResourceAllowed('audit_log', 'read') && (
                <NavButtonWithTooltip
                  href={`${workspaceUrl}/logs`}
                  icon={<TbLogs className='size-4' />}
                  label={dict.common.logs}
                  tooltip={dict.workspace.dashboardTooltips.logs}
                />
              )}
              {/* Catalog & Lineage — the /catalog route renders the
                  DocumentationSection (internal naming stays
                  "documentation" in API, DB, and
                  src/components/documentation/*; only the UI-facing
                  label and route path were renamed). The
                  isResourceAllowed check uses the internal permission
                  key 'documentation' intentionally. */}
              {isResourceAllowed('documentation', 'read') && (
                <NavButtonWithTooltip
                  href={`${workspaceUrl}/catalog`}
                  icon={<TbSchema className='size-4' />}
                  label={dict.catalog.catalogAndLineage}
                  tooltip={dict.catalog.catalogAndLineageTooltip}
                />
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant='ghost'
                    size='sm'
                    className='gap-1 text-xs'
                    aria-label={dict.common.more}
                  >
                    {dict.common.more}
                    <TbChevronDown
                      className='size-3 opacity-70'
                      aria-hidden='true'
                    />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='start'>
                  {isResourceAllowed('user', 'read') && (
                    <DropdownMenuItem asChild>
                      <a href={`${workspaceUrl}/settings/users`}>
                        <TbUsersGroup
                          className='size-4 opacity-70'
                          aria-hidden='true'
                        />
                        <span>{dict.workspace.users}</span>
                      </a>
                    </DropdownMenuItem>
                  )}
                  {isResourceAllowed('invite', 'read') && (
                    <DropdownMenuItem asChild>
                      <a href={`${workspaceUrl}/settings/invites`}>
                        <TbMail
                          className='size-4 opacity-70'
                          aria-hidden='true'
                        />
                        <span>{dict.workspace.invites}</span>
                      </a>
                    </DropdownMenuItem>
                  )}
                  {isResourceAllowed('workspace_tag', 'read') && (
                    <DropdownMenuItem asChild>
                      <a href={`${workspaceUrl}/settings/tags`}>
                        <TbTag
                          className='size-4 opacity-70'
                          aria-hidden='true'
                        />
                        <span>{dict.workspace.tags}</span>
                      </a>
                    </DropdownMenuItem>
                  )}
                  {!clientEnv.NEXT_PUBLIC_BILLING_DISABLED &&
                    isResourceAllowed('billing', 'read') && (
                      <DropdownMenuItem asChild>
                        <a href={`${workspaceUrl}/settings/billing`}>
                          <TbInvoice
                            className='size-4 opacity-70'
                            aria-hidden='true'
                          />
                          <span>{dict.workspace.billing}</span>
                        </a>
                      </DropdownMenuItem>
                    )}
                  <DropdownMenuItem asChild>
                    <a href={`${workspaceUrl}/settings/api-mcp`}>
                      <TbCode
                        className='size-4 opacity-70'
                        aria-hidden='true'
                      />
                      <span>{dict.workspace.apiMcp}</span>
                    </a>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </TooltipProvider>
          <BillingBanner />
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
          {/* Wizard entry points. Rendered as a flat hairline-separated row
              (or stacked on mobile) instead of the old 3-column icon-in-
              circle card grid — that was the textbook AI-slop layout.
              Typography + a trailing arrow carry the affordance now. */}
          <div
            className={`
              flex w-full flex-col items-stretch border-t border-border
              md:flex-row
            `}
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
