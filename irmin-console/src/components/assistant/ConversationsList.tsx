'use client';

import { TbChevronRight, TbInfoCircle } from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import { CommonErrorDisplay } from '@/components/ui/error/CommonErrorDisplay';
import ListSkeleton from '@/components/ui/loading/ListSkeleton';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

import { useLocale } from '@/context/LocaleContext';

import { useAIConversations } from '@/hooks/api/useAIConversations';

import { formatTimestamp } from '@/utils/formatTimestamp';

import type { AIConversation } from '@/types/ai/base';

interface ConversationsListProps {
  selectedConversation?: AIConversation | null;
  onSelectConversation: (conversation: AIConversation | null) => void;
  onSidebarClose: () => void;
  onDetailsOpen: () => void;
}

export default function ConversationsList({
  selectedConversation,
  onSelectConversation,
  onSidebarClose,
  onDetailsOpen,
}: ConversationsListProps) {
  const { locale, dict } = useLocale();

  // Fetch conversations with pagination, sorted by creation date descending
  const {
    aiConversationsQuery,
    createAIConversationMutation,
    currentPage,
    pagination,
    goToPage,
    nextPage,
    previousPage,
    hasNextPage,
    hasPreviousPage,
  } = useAIConversations({
    sortBy: 'createdAt',
    sortOrder: 'desc',
    agentId: 'chat', // Filter for chat agent conversations
  });

  const handleCreateConversation = async () => {
    try {
      const result = await createAIConversationMutation.mutateAsync({
        agentId: 'chat', // Create as chat agent conversation
      });
      onSelectConversation(result);
      onSidebarClose();
    } catch {
      // Error handling is done in the mutation hook
    }
  };

  const conversations = aiConversationsQuery.data?.data || [];
  const isLoading = aiConversationsQuery.isLoading;
  const error = aiConversationsQuery.error;

  if (isLoading) {
    return <ListSkeleton items={6} className='p-2' />;
  }

  if (error) {
    return (
      <CommonErrorDisplay
        error={error}
        variant='inline'
        showDetails={false}
        showReload={false}
        showHome={false}
        showReport={false}
        className='p-4'
      />
    );
  }

  return (
    <>
      <div className='p-2'>
        <Button
          className='w-full'
          variant='default'
          onClick={handleCreateConversation}
        >
          {dict.assistant.newConversation}
        </Button>
      </div>

      {/* Conversations list */}
      {conversations.map((conversation: AIConversation) => (
        <div
          key={`conversation-${conversation.id}`}
          className={`
            flex cursor-pointer flex-row items-center justify-between gap-2
            border-b border-border p-4 transition-all
            hover:bg-card
            ${selectedConversation?.id === conversation.id ? 'bg-card' : ''}
          `}
          onClick={() => {
            onSelectConversation(conversation);
            onSidebarClose(); // Close sidebar on mobile after selection
          }}
          role='button'
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onSelectConversation(conversation);
              onSidebarClose();
            }
          }}
        >
          <div className='flex flex-col gap-1'>
            <p className='text-sm'>
              {conversation.title || 'Untitled Conversation'}
            </p>
            <p className='text-xs text-foreground/30'>
              {formatTimestamp(conversation.createdAt, locale)}
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <Button
              variant='ghost'
              size='sm'
              onClick={(e) => {
                e.stopPropagation();
                onSelectConversation(conversation);
                onDetailsOpen();
              }}
              className='p-1 opacity-50'
            >
              <TbInfoCircle size={18} />
            </Button>
            <TbChevronRight size={22} />
          </div>
        </div>
      ))}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className='border-t border-border p-4'>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={previousPage}
                  className={
                    !hasPreviousPage ? 'pointer-events-none opacity-50' : ''
                  }
                />
              </PaginationItem>

              {/* Page numbers */}
              {Array.from(
                { length: pagination.totalPages },
                (_, i) => i + 1
              ).map((page) => (
                <PaginationItem key={page}>
                  <PaginationLink
                    onClick={() => goToPage(page)}
                    isActive={currentPage === page}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext
                  onClick={nextPage}
                  className={
                    !hasNextPage ? 'pointer-events-none opacity-50' : ''
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </>
  );
}
