'use client';

import { TbBrain } from 'react-icons/tb';

import { EmptyState } from '@/components/ui/EmptyState';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import type { AIApplication } from '@/types/core/AIApplication';

import AIApplicationCard from './AIApplicationCard';

interface AIApplicationListProps {
  loading: boolean;
  aiApplications: AIApplication[];
  emptyStateAction?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'gradient';
  };
  hideActionButton?: boolean;
}

/**
 * List of AI Application cards
 */
export default function AIApplicationList({
  loading,
  aiApplications,
  emptyStateAction,
  hideActionButton = false,
}: AIApplicationListProps) {
  if (loading) {
    return (
      <div
        className={`
          grid grid-cols-1 gap-4
          md:grid-cols-2
          lg:grid-cols-3
        `}
      >
        {Array.from({ length: 6 }, (_, i) => `loading-${i}`).map((id) => (
          <LoadingSkeleton key={id} className='h-40 w-full' />
        ))}
      </div>
    );
  }

  if (aiApplications.length === 0) {
    return (
      <EmptyState
        icon={<TbBrain size={48} />}
        title='No AI Applications'
        description='Create your first AI Application to enable LLM agents to access your workspace data through MCP and REST APIs.'
        action={emptyStateAction}
        hideActionButton={hideActionButton}
      />
    );
  }

  return (
    <div
      className={`
        grid grid-cols-1 gap-4
        md:grid-cols-2
        lg:grid-cols-3
      `}
    >
      {aiApplications.map((aiApp) => (
        <AIApplicationCard key={aiApp.id} aiApplication={aiApp} />
      ))}
    </div>
  );
}
