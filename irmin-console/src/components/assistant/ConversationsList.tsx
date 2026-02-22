'use client';

import { useMemo, useState } from 'react';

import { TbMessageCircle, TbPlus, TbTrash } from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import { CommonErrorDisplay } from '@/components/ui/error/CommonErrorDisplay';
import { Input } from '@/components/ui/input';
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
import { usePopup } from '@/context/PopupContext';

import { useAIConversation } from '@/hooks/api/useAIConversation';
import { useAIConversations } from '@/hooks/api/useAIConversations';

import { formatRelativeTime } from '@/utils/formatTimestamp';
import { cn } from '@/utils/tw';

import type { AIConversation } from '@/types/ai/base';

interface ConversationsListProps {
  selectedConversation?: AIConversation | null;
  onSelectConversation: (conversation: AIConversation | null) => void;
  onSidebarClose: () => void;
}

export default function ConversationsList({
  selectedConversation,
  onSelectConversation,
  onSidebarClose,
}: ConversationsListProps) {
  const { locale, dict } = useLocale();
  const { irminConfirm } = usePopup();
  const [searchQuery, setSearchQuery] = useState('');

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

  const conversations = useMemo(
    () => aiConversationsQuery.data?.data || [],
    [aiConversationsQuery.data?.data]
  );
  const isLoading = aiConversationsQuery.isLoading;
  const error = aiConversationsQuery.error;

  // Filter conversations by search query
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const query = searchQuery.toLowerCase();
    return conversations.filter(
      (c) =>
        c.title?.toLowerCase().includes(query) ||
        c.id.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

  // Get the delete mutation from useAIConversation hook
  // We use a dummy conversation ID since we only need the mutation
  const { deleteAIConversationMutation } = useAIConversation('');

  const handleDeleteConversation = async (
    e: React.MouseEvent,
    conversation: AIConversation
  ) => {
    e.stopPropagation();
    const confirmed = await irminConfirm(
      'warning',
      `${dict.common.areYouSureYouWantToDelete} (${conversation.title || 'Untitled'})`
    );
    if (confirmed) {
      deleteAIConversationMutation.mutate(conversation.id);
      // If the deleted conversation was selected, clear selection
      if (selectedConversation?.id === conversation.id) {
        onSelectConversation(null);
      }
    }
  };

  return (
    <div className='flex h-full flex-col bg-background'>
      <div
        className={`flex shrink-0 flex-col gap-3 border-b border-border/40 p-4`}
      >
        <Button
          className='w-full justify-center gap-2'
          variant='default'
          onClick={handleCreateConversation}
        >
          <TbPlus size={18} />
          {dict.assistant.newConversation}
        </Button>
        <Input
          placeholder={dict.assistant.searchConversations}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className='h-9'
        />
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
            <TbMessageCircle size={24} className='mb-2 opacity-20' />
            <p className='text-sm'>
              {dict.assistant.noConversations || 'No conversations yet'}
            </p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div
            className={`
              flex h-40 flex-col items-center justify-center text-center
              text-muted-foreground
            `}
          >
            <TbMessageCircle size={24} className='mb-2 opacity-20' />
            <p className='text-sm'>{dict.assistant.noSearchResults}</p>
          </div>
        ) : (
          <div className='flex flex-col gap-0.5'>
            {filteredConversations.map((conversation: AIConversation) => (
              <div
                key={`conversation-${conversation.id}`}
                className={cn(
                  `
                    content-visibility-auto group flex cursor-pointer
                    items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm
                    transition-colors
                  `,
                  selectedConversation?.id === conversation.id
                    ? 'bg-accent text-accent-foreground'
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
                <TbMessageCircle
                  size={16}
                  className={cn(
                    'shrink-0',
                    selectedConversation?.id === conversation.id
                      ? 'text-accent-foreground/70'
                      : 'text-muted-foreground/50'
                  )}
                />
                <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
                  <span
                    className={cn(
                      'truncate text-[13px] leading-tight font-medium',
                      selectedConversation?.id === conversation.id
                        ? 'text-accent-foreground'
                        : `
                          text-foreground/90
                          group-hover:text-foreground
                        `
                    )}
                  >
                    {conversation.title || 'Untitled'}
                  </span>
                  <span className='text-[11px] leading-tight opacity-60'>
                    {formatRelativeTime(conversation.createdAt, locale)}
                  </span>
                </div>

                <button
                  type='button'
                  className={cn(
                    `
                      flex size-5 shrink-0 items-center justify-center
                      rounded-sm text-muted-foreground/60 transition-all
                      hover:bg-destructive/10 hover:text-destructive
                    `,
                    selectedConversation?.id === conversation.id
                      ? `
                        opacity-60
                        hover:opacity-100
                      `
                      : `
                        opacity-0
                        group-hover:opacity-60
                        group-hover:hover:opacity-100
                      `
                  )}
                  onClick={(e) => handleDeleteConversation(e, conversation)}
                >
                  <TbTrash size={13} />
                </button>
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
                  hideLabel={true}
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
                  hideLabel={true}
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
