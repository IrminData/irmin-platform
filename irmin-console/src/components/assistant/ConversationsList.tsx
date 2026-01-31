'use client';

import { TbInfoCircle, TbMessage, TbPlus } from 'react-icons/tb';

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
import { cn } from '@/utils/tw';

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
    agentId: 'assistant', // Filter for chat agent conversations
  });

  const handleCreateConversation = async () => {
    try {
      const result = await createAIConversationMutation.mutateAsync({
        agentId: 'assistant', // Create as chat agent conversation
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

  return (
    <div className='flex h-full flex-col bg-background'>
      <div className='shrink-0 border-b border-border/40 p-4'>
        <Button
          className='w-full justify-start gap-2'
          variant='default'
          onClick={handleCreateConversation}
        >
          <TbPlus size={18} />
          {dict.assistant.newConversation}
        </Button>
      </div>

      <div className='flex-1 overflow-y-auto p-2'>
        {isLoading ? (
          <ListSkeleton items={6} className='p-2' />
        ) : error ? (
          <CommonErrorDisplay
            error={error}
            variant='inline'
            showDetails={false}
            showReload={false}
            showHome={false}
            showReport={false}
            className='p-4'
          />
        ) : conversations.length === 0 ? (
          <div
            className={`
              flex h-40 flex-col items-center justify-center text-center
              text-muted-foreground
            `}
          >
            <TbMessage size={24} className='mb-2 opacity-20' />
            <p className='text-sm'>
              {dict.assistant.noConversations || 'No conversations yet'}
            </p>
          </div>
        ) : (
          <div className='flex flex-col gap-1'>
            {conversations.map((conversation: AIConversation) => (
              <div
                key={`conversation-${conversation.id}`}
                className={cn(
                  `
                    content-visibility-auto group flex cursor-pointer
                    items-center justify-between gap-3 rounded-md p-3 text-sm
                    transition-all
                  `,
                  selectedConversation?.id === conversation.id
                    ? `
                      bg-card text-card-foreground shadow-sm ring-1
                      ring-border/50
                    `
                    : `
                      text-muted-foreground
                      hover:bg-muted/50 hover:text-foreground
                    `
                )}
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
                <div className='flex min-w-0 flex-1 flex-col gap-1'>
                  <span
                    className={cn(
                      'truncate font-medium transition-colors',
                      selectedConversation?.id === conversation.id
                        ? 'text-foreground'
                        : `
                          text-foreground/80
                          group-hover:text-foreground
                        `
                    )}
                  >
                    {conversation.title || 'Untitled Conversation'}
                  </span>
                  <span className='truncate text-xs opacity-70'>
                    {formatTimestamp(conversation.createdAt, locale)}
                  </span>
                </div>

                <Button
                  variant='ghost'
                  size='icon'
                  className={cn(
                    `
                      size-7 shrink-0 transition-opacity
                      hover:bg-background/50
                    `,
                    selectedConversation?.id === conversation.id
                      ? 'opacity-100'
                      : `
                        opacity-0
                        group-hover:opacity-100
                      `
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectConversation(conversation);
                    onDetailsOpen();
                  }}
                >
                  <TbInfoCircle size={16} />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className='shrink-0 border-t border-border/40 p-2'>
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

              {/* Simple page indicator instead of full list if too many pages, 
                  or keeping existing behavior but styled simpler */}
              {/* Showing current page context if many pages could be better, 
                  but keeping it simple for now as per existing logic */}
              {pagination.totalPages <= 5 ? (
                Array.from(
                  { length: pagination.totalPages },
                  (_, i) => i + 1
                ).map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => goToPage(page)}
                      isActive={currentPage === page}
                      size='icon'
                      className='size-8'
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))
              ) : (
                <PaginationItem>
                  <span className='px-4 text-sm text-muted-foreground'>
                    {currentPage} / {pagination.totalPages}
                  </span>
                </PaginationItem>
              )}

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
    </div>
  );
}
