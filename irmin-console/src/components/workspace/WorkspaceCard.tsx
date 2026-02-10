'use client';

import { memo, useCallback } from 'react';

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

import type { WorkspaceSummary } from '@/types/core/Workspace';

/**
 * Compact workspace row component
 *
 * Displays a workspace as a slim horizontal row with icon, name/description,
 * resource stats, and a navigation chevron.
 */
const WorkspaceCard = ({
  workspace,
  isRecentlyUsed,
  handleClick,
}: {
  workspace: WorkspaceSummary;
  isRecentlyUsed?: boolean;
  handleClick: (_slug: string) => void;
}) => {
  const { dict } = useLocale();
  const openWorkspace = useCallback(() => {
    handleClick(workspace.slug);
  }, [workspace.slug, handleClick]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openWorkspace();
      }
    },
    [openWorkspace]
  );

  return (
    <button
      className={`
        group flex w-full cursor-pointer items-center gap-4 rounded-xl border-0
        bg-card px-4 py-3 text-left transition-colors duration-150
        hover:bg-card/80
      `}
      onClick={openWorkspace}
      onKeyDown={handleKeyDown}
      aria-label={`Go to ${workspace.name} workspace`}
    >
      {/* Icon */}
      <div
        className={`
          flex size-9 shrink-0 items-center justify-center rounded-lg
          bg-irmin-green-500/10 text-irmin-green-500
        `}
      >
        <TbBuilding className='size-4' />
      </div>

      {/* Name + Description */}
      <div className='min-w-0 flex-1'>
        <div className='flex items-center gap-2'>
          <span className='truncate text-sm font-semibold text-foreground'>
            {workspace.name}
          </span>
          {isRecentlyUsed && (
            <span
              className={`
                flex shrink-0 items-center gap-1 rounded-full
                bg-irmin-green-500/10 px-1.5 py-0.5 text-[10px] font-medium
                text-irmin-green-500
              `}
            >
              <TbClock className='size-2.5' />
              {dict.workspace.recentlyUsed}
            </span>
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
        <div className='flex items-center gap-1 text-xs text-muted-foreground'>
          <TbUsers className='size-3.5' />
          <span>{workspace.member_count}</span>
        </div>
        <div className='flex items-center gap-1 text-xs text-muted-foreground'>
          <TbDatabase className='size-3.5' />
          <span>{workspace.repository_count}</span>
        </div>
        <div className='flex items-center gap-1 text-xs text-muted-foreground'>
          <TbRun className='size-3.5' />
          <span>{workspace.workflow_count}</span>
        </div>
        <div className='flex items-center gap-1 text-xs text-muted-foreground'>
          <TbPlug className='size-3.5' />
          <span>{workspace.connection_count}</span>
        </div>
      </div>

      {/* Chevron */}
      <TbChevronRight
        className={`
          size-4 shrink-0 text-muted-foreground transition-transform
          duration-150
          group-hover:translate-x-0.5
        `}
      />
    </button>
  );
};

export default memo(WorkspaceCard);
