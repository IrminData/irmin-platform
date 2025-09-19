'use client';

import Link from 'next/link';

import { GoWorkflow } from 'react-icons/go';
import { TbDatabase, TbDots, TbPlus, TbRun } from 'react-icons/tb';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';

import type { Connection } from '@/types/core/Connection';
import type { Repository } from '@/types/core/Repository';
import type { Workflow as WorkflowType } from '@/types/core/Workflow';
import type { EmptyStateAction } from '@/types/internal/ListProps';

interface DashboardListCardProps {
  title: string;
  type: 'repositories' | 'connections' | 'workflows';
  loading?: boolean;
  items: (Repository | WorkflowType | Connection)[];
  viewAllHref: string;
  createNewHref: string;
  workspaceUrl: string;
  emptyStateAction?: EmptyStateAction;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  className?: string;
  hideCreateNewButton?: boolean;
}

const iconMap = {
  repositories: TbDatabase,
  connections: GoWorkflow,
  workflows: TbRun,
};

// Helper function to get item details based on type
const getItemDetails = (
  item: Repository | WorkflowType | Connection,
  type: string
) => {
  switch (type) {
    case 'repositories': {
      const repo = item as Repository;
      return {
        id: repo.id,
        name: repo.name,
        description: repo.description,
        lastUpdated: repo.updated_at,
        href: `${repo.slug}`,
      };
    }
    case 'workflows': {
      const workflow = item as WorkflowType;
      return {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        type: workflow.type, // Add workflow type
        lastUpdated: new Date().toISOString(), // Fallback since workflow doesn't have updated_at
        href: workflow.id,
      };
    }
    case 'connections': {
      const connection = item as Connection;
      return {
        id: connection.id,
        name: connection.name,
        description: connection.description,
        lastUpdated: new Date().toISOString(), // Fallback since connection doesn't have updated_at
        href: connection.id,
      };
    }
    default:
      return {
        id: '',
        name: '',
        description: '',
        lastUpdated: '',
        href: '',
      };
  }
};

/**
 * Dashboard list card component
 *
 * @param props - The component props
 * @param props.title - The title of the card
 * @param props.type - The type of the card
 * @param props.items - The items to display in the card
 * @param props.className - The class name of the card
 */
export function DashboardListCard({
  title,
  type,
  loading = false,
  items,
  viewAllHref,
  createNewHref,
  workspaceUrl,
  emptyStateAction,
  emptyStateTitle,
  emptyStateDescription,
  className,
  hideCreateNewButton = false,
}: DashboardListCardProps) {
  const { dict } = useLocale();
  const Icon = iconMap[type];

  return (
    <Card
      className={`
        flex h-full flex-col bg-card
        ${className || ''}
      `}
    >
      <CardHeader
        className={`
          p-4
          lg:p-4
        `}
      >
        <div className='flex items-center justify-between'>
          <CardTitle className='flex items-center gap-2 text-base'>
            <Icon className='size-4 text-primary' />
            {title}
          </CardTitle>
          <div className='flex items-center gap-2'>
            {items.length > 0 && (
              <Button
                variant='ghost'
                size='sm'
                className='text-xs'
                href={viewAllHref}
              >
                {dict.list.viewAll}
              </Button>
            )}
            {!hideCreateNewButton && items.length > 0 && (
              <Button
                size='sm'
                icon={<TbPlus className='size-3' />}
                href={createNewHref}
              >
                {dict.common.create}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent
        className={`
          flex flex-1 flex-col px-2 pt-0 pb-2
          lg:px-4
        `}
      >
        {loading ? (
          <div className='space-y-1'>
            {Array.from({ length: 5 }, (_, index) => (
              <div
                key={`skeleton-${type}-item-${index}`}
                className='rounded-lg border border-border p-1.5'
              >
                <LoadingSkeleton className='mb-0.5 h-5 w-3/4' />
                <LoadingSkeleton className='h-4 w-1/2' />
              </div>
            ))}
          </div>
        ) : (
          <>
            {items.length === 0 ? (
              <EmptyState
                icon={<Icon className='size-full opacity-50' />}
                title={emptyStateTitle}
                description={emptyStateDescription}
                action={emptyStateAction}
                size='sm'
              />
            ) : (
              <>
                <div className='flex-1 space-y-1'>
                  {items.map((item) => {
                    const itemDetails = getItemDetails(item, type);
                    return (
                      <div
                        key={itemDetails.id}
                        className={`
                          flex h-auto items-center justify-between rounded-lg
                          border border-border p-1.5
                        `}
                      >
                        <div className='min-w-0 flex-1'>
                          <div className='mb-0.5 flex items-center gap-2'>
                            <Link
                              href={`${workspaceUrl}/${type}/${itemDetails.href}`}
                            >
                              {itemDetails.name}
                            </Link>
                            {type === 'workflows' && (
                              <Badge className='px-1 py-0 text-xs'>
                                {itemDetails.type === 'action' &&
                                  dict.workflow.action}
                                {itemDetails.type === 'import' &&
                                  dict.workflow.import}
                                {itemDetails.type === 'export' &&
                                  dict.workflow.export}
                                {itemDetails.type === 'pipeline' &&
                                  dict.workflow.pipeline.pipeline}
                              </Badge>
                            )}
                          </div>
                          <p className='truncate text-xs text-muted-foreground'>
                            {itemDetails.description}
                          </p>
                        </div>
                        <Button
                          variant='ghost'
                          size='sm'
                          className='ml-1 size-6 p-0'
                          href={`${workspaceUrl}/${type}/${itemDetails.href}`}
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          <TbDots className='size-3' />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
