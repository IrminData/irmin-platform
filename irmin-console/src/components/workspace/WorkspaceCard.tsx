'use client';

import { memo } from 'react';

import Link from 'next/link';

import {
  TbBuilding,
  TbChevronRight,
  TbClock,
  TbDatabase,
  TbPlug,
  TbRun,
  TbUsers,
} from 'react-icons/tb';

import { useLocale } from '@/context/LocaleContext';

import type { Workspace, WorkspaceSummary } from '@/types/core/Workspace';

import WorkspaceStat from './WorkspaceStat';

/**
 * Compact workspace row component
 *
 * Displays a workspace as a slim horizontal row with icon, name/description,
 * resource stats, and a navigation chevron. Accepts either a full
 * WorkspaceSummary (with stats) or a basic Workspace (stats shown as
 * skeleton placeholders until summary data loads). Renders as a Link so
 * Cmd/Ctrl+click and middle-click open the workspace in a new tab as
 * expected.
 */
const WorkspaceCard = ({
  workspace,
  summary,
  isRecentlyUsed,
}: {
  workspace: Workspace | WorkspaceSummary;
  summary?: WorkspaceSummary;
  isRecentlyUsed?: boolean;
}) => {
  const { dict, locale } = useLocale();

  const hasSummary = summary != null;

  return (
    <Link
      href={`/${locale}/workspace/${workspace.slug}`}
      className={`
        group flex w-full items-center gap-4 rounded-xl border border-border
        bg-card px-4 py-3 text-left shadow-xs
        transition-[background-color,border-color,box-shadow] duration-150
        hover:border-irmin-green-500/40 hover:bg-card/80 hover:shadow-sm
        focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none
      `}
      aria-label={dict.workspace.goToWorkspaceAriaLabel.replace(
        '{name}',
        workspace.name
      )}
    >
      {/* Icon */}
      <div
        className={`
          flex size-9 shrink-0 items-center justify-center rounded-lg
          bg-irmin-green-500/10 text-irmin-green-500
        `}
      >
        <TbBuilding className='size-4' aria-hidden='true' />
      </div>

      {/* Name + Description */}
      <div className='min-w-0 flex-1'>
        <div className='flex items-center gap-2'>
          <span className='truncate text-sm font-semibold text-foreground'>
            {workspace.name}
          </span>
          {hasSummary ? (
            isRecentlyUsed && (
              <span
                className={`
                  flex shrink-0 items-center gap-1 rounded-full
                  bg-irmin-green-500/10 px-1.5 py-0.5 text-[11px] font-medium
                  text-irmin-green-500
                `}
              >
                <TbClock className='size-2.5' aria-hidden='true' />
                {dict.workspace.recentlyUsed}
              </span>
            )
          ) : (
            <div className={`h-4 w-20 animate-pulse rounded-full bg-muted`} />
          )}
        </div>
        {workspace.description && (
          <p className='truncate text-xs text-muted-foreground'>
            {workspace.description}
          </p>
        )}
      </div>

      {/* Stats */}
      <div
        className={`
          hidden shrink-0 items-center gap-4
          md:flex
        `}
      >
        <WorkspaceStat
          Icon={TbUsers}
          count={summary?.member_count}
          label={dict.workspace.stats.members}
        />
        <WorkspaceStat
          Icon={TbDatabase}
          count={summary?.repository_count}
          label={dict.workspace.stats.repositories}
        />
        <WorkspaceStat
          Icon={TbRun}
          count={summary?.workflow_count}
          label={dict.workspace.stats.workflows}
        />
        <WorkspaceStat
          Icon={TbPlug}
          count={summary?.connection_count}
          label={dict.workspace.stats.connections}
        />
      </div>

      {/* Chevron */}
      <TbChevronRight
        aria-hidden='true'
        className={`
          size-4 shrink-0 text-muted-foreground transition-transform
          duration-150 ease-out
          group-hover:translate-x-0.5
        `}
      />
    </Link>
  );
};

export default memo(WorkspaceCard);
