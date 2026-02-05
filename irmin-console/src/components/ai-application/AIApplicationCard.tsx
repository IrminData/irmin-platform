'use client';

import Link from 'next/link';

import { TbBrain, TbDatabase, TbKey } from 'react-icons/tb';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { formatTimestamp } from '@/utils/formatTimestamp';

import type { AIApplication } from '@/types/core/AIApplication';

interface AIApplicationCardProps {
  aiApplication: AIApplication;
}

/**
 * Card displaying an AI Application summary
 */
export default function AIApplicationCard({
  aiApplication,
}: AIApplicationCardProps) {
  const { workspaceSlug } = useWorkspaceContext();
  const { locale } = useLocale();

  // Count enabled tools
  const enabledToolsCount = aiApplication.tools
    ? Object.values(aiApplication.tools).filter(Boolean).length
    : 0;

  return (
    <Link
      href={`/${locale}/workspace/${workspaceSlug}/ai-applications/${aiApplication.id}`}
    >
      <Card
        className={`
          h-full cursor-pointer transition-all
          hover:shadow-lg
        `}
      >
        <CardHeader className='pb-2'>
          <CardTitle className='flex items-center gap-2 text-lg'>
            <TbBrain className='text-primary' size={20} />
            <span className='truncate'>{aiApplication.name}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-3'>
          {aiApplication.description && (
            <p className='line-clamp-2 text-sm text-muted-foreground'>
              {aiApplication.description}
            </p>
          )}

          <div className='flex flex-wrap gap-2 text-xs text-muted-foreground'>
            <div className='flex items-center gap-1'>
              <TbDatabase size={14} />
              <span>
                {aiApplication.data_sources?.length ?? 0} data source
                {(aiApplication.data_sources?.length ?? 0) !== 1 ? 's' : ''}
              </span>
            </div>
            <div className='flex items-center gap-1'>
              <TbKey size={14} />
              <span>
                {enabledToolsCount} tool{enabledToolsCount !== 1 ? 's' : ''}{' '}
                enabled
              </span>
            </div>
          </div>

          <div
            className={`
              flex items-center justify-between border-t pt-2 text-xs
              text-muted-foreground
            `}
          >
            <span>Owner: {aiApplication.owner.first_name}</span>
            <span>{formatTimestamp(aiApplication.updated_at, locale)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
