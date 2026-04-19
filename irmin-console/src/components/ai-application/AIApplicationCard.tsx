'use client';

import Link from 'next/link';

import { TbArrowUpRight, TbBrain, TbDatabase, TbKey } from 'react-icons/tb';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { formatTimestamp } from '@/utils/formatTimestamp';

import type { AIApplication } from '@/types/core/AIApplication';

interface AIApplicationCardProps {
  aiApplication: AIApplication;
}

/**
 * Card displaying an AI Application summary.
 *
 * Hover state echoes the WorkspaceCard pattern for consistency across the
 * console's primary tile surfaces: border transitions to a desaturated
 * Irmin Green, shadow lifts modestly (xs → sm), the brain icon gains full
 * opacity, and a small diagonal arrow slides in as an "open in app" affordance.
 */
export default function AIApplicationCard({
  aiApplication,
}: AIApplicationCardProps) {
  const { workspaceSlug } = useWorkspaceContext();
  const { dict, locale } = useLocale();

  // Count enabled tools
  const enabledToolsCount = aiApplication.tools
    ? Object.values(aiApplication.tools).filter(Boolean).length
    : 0;

  const dataSourceCount = aiApplication.data_sources?.length ?? 0;

  const dataSourceLabel =
    dataSourceCount === 1
      ? dict.aiApplication.dataSource
      : dict.aiApplication.dataSources;
  const toolsLabel =
    enabledToolsCount === 1
      ? dict.aiApplication.toolEnabled
      : dict.aiApplication.toolsEnabled;

  return (
    <Link
      href={`/${locale}/workspace/${workspaceSlug}/ai-applications/${aiApplication.id}`}
      className={`
        group block h-full rounded-xl
        focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none
      `}
    >
      <Card
        className={`
          relative flex h-full flex-col transition-[border-color,box-shadow]
          duration-150 ease-in-out
          hover:border-irmin-green-500/40 hover:shadow-sm
        `}
      >
        <CardHeader className='pb-2'>
          <CardTitle className='flex items-center gap-2 text-lg'>
            <TbBrain
              aria-hidden='true'
              className={`
                text-primary/80 transition-[color,transform] duration-150
                ease-out
                group-hover:scale-105 group-hover:text-primary
              `}
              size={20}
            />
            <span className='truncate'>{aiApplication.name}</span>
            <TbArrowUpRight
              aria-hidden='true'
              className={`
                ml-auto size-4 shrink-0 text-muted-foreground opacity-0
                transition-[opacity,transform] duration-150 ease-out
                group-hover:translate-x-0.5 group-hover:-translate-y-0.5
                group-hover:opacity-100
              `}
            />
          </CardTitle>
        </CardHeader>
        <CardContent className='flex flex-1 flex-col space-y-3'>
          {aiApplication.description ? (
            <p className='line-clamp-2 text-sm text-muted-foreground'>
              {aiApplication.description}
            </p>
          ) : (
            <p className='text-sm text-muted-foreground/60 italic'>
              {dict.aiApplication.noDescription}
            </p>
          )}

          <div className='flex flex-wrap gap-3 text-xs text-muted-foreground'>
            <div className='flex items-center gap-1 tabular-nums'>
              <TbDatabase aria-hidden='true' size={14} />
              <span>
                {dataSourceCount} {dataSourceLabel}
              </span>
            </div>
            <div className='flex items-center gap-1 tabular-nums'>
              <TbKey aria-hidden='true' size={14} />
              <span>
                {enabledToolsCount} {toolsLabel}
              </span>
            </div>
          </div>

          <div
            className={`
              mt-auto flex items-center justify-between border-t border-border
              pt-2 text-xs text-muted-foreground
            `}
          >
            <span className='truncate'>
              {dict.common.owner}: {aiApplication.owner.first_name}
            </span>
            <span className='shrink-0 tabular-nums'>
              {formatTimestamp(aiApplication.updated_at, locale)}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
