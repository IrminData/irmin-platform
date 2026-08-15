'use client';

import { useId, useMemo, useState } from 'react';

import { TbMessageCircle, TbPlus, TbSearch, TbTrash } from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import { LocalizedErrorDisplay } from '@/components/ui/error/CommonErrorDisplay';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  const searchInputId = useId();

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

  const handleDeleteConversation = async (conversation: AIConversation) => {
    const confirmed = await irminConfirm(
      'warning',
      `${dict.common.areYouSureYouWantToDelete} (${conversation.title || dict.assistant.untitledConversation})`,
      dict.assistant.deleteConversation
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
          variant='accent'
          onClick={handleCreateConversation}
        >
          <TbPlus size={18} />
          {dict.assistant.newConversation}
        </Button>
        <Label htmlFor={searchInputId} className='sr-only'>
          {dict.assistant.searchConversationsLabel}
        </Label>
        <Input
          id={searchInputId}
          placeholder={dict.assistant.searchConversations}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon={<TbSearch size={16} />}
        />
      </div>

      <div className='flex-1 overflow-y-auto p-2'>
        {isLoading ? (
          <ListSkeleton items={6} className='p-2' />
        ) : error ? (
          <LocalizedErrorDisplay
            error={error}
            title={dict.common.errors.failedToLoadConversations}
            description={dict.common.errors.failedToLoadAgain}
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
            <p className='text-sm'>{dict.assistant.noConversations}</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div
            className={`
              flex h-40 flex-col items-center justify-center text-center
              text-muted-foreground
            `}
          >
            <TbMessageCircle size={24} className='mb-2 opacity-20' />
            <p className='text-sm text-pretty'>
              {dict.assistant.noSearchResultsFor.replace(
                '{query}',
                searchQuery.trim()
              )}
            </p>
            <Button
              className='mt-3'
              size='sm'
              variant='secondary'
              onClick={() => setSearchQuery('')}
            >
              {dict.assistant.clearSearch}
            </Button>
          </div>
        ) : (
          <ul className='flex flex-col gap-0.5'>
            {filteredConversations.map((conversation: AIConversation) => {
              const isSelected = selectedConversation?.id === conversation.id;
              const conversationTitle =
                conversation.title || dict.assistant.untitledConversation;
              const deleteLabel =
                dict.assistant.deleteConversationNamed.replace(
                  '{title}',
                  conversationTitle
                );

              return (
                <li
                  key={`conversation-${conversation.id}`}
                  className={cn(
                    `
                      content-visibility-auto group flex items-stretch
                      rounded-[2px] text-sm transition-colors
                    `,
                    isSelected
                      ? 'bg-accent text-accent-foreground'
                      : `
                        text-muted-foreground
                        hover:bg-muted/50 hover:text-foreground
                      `
                  )}
                >
                  <button
                    type='button'
                    className={`
                      flex min-w-0 flex-1 items-center gap-2.5 rounded-[2px]
                      px-3 py-2.5 text-left
                      focus-visible:outline-2 focus-visible:outline-offset-1
                      focus-visible:outline-accent
                    `}
                    aria-current={isSelected ? 'true' : undefined}
                    aria-pressed={isSelected}
                    onClick={() => {
                      onSelectConversation(conversation);
                      onSidebarClose();
                    }}
                  >
                    <TbMessageCircle
                      size={16}
                      className={cn(
                        'shrink-0',
                        isSelected
                          ? 'text-accent-foreground/70'
                          : 'text-muted-foreground/50'
                      )}
                    />
                    <span className='flex min-w-0 flex-1 flex-col gap-0.5'>
                      <span
                        className={cn(
                          'truncate text-[13px] leading-tight font-medium',
                          isSelected
                            ? 'text-accent-foreground'
                            : `
                              text-foreground/90
                              group-hover:text-foreground
                            `
                        )}
                      >
                        {conversationTitle}
                      </span>
                      <span className='text-[11px] leading-tight opacity-60'>
                        {formatRelativeTime(conversation.createdAt, locale)}
                      </span>
                    </span>
                  </button>

                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    icon={<TbTrash size={14} />}
                    aria-label={deleteLabel}
                    title={deleteLabel}
                    className={cn(
                      `
                        shrink-0 self-center text-muted-foreground/60 opacity-60
                        hover:bg-destructive/10 hover:text-destructive
                        focus-visible:opacity-100
                        md:opacity-0
                        md:group-hover:opacity-60
                        md:focus-visible:opacity-100
                      `,
                      isSelected && 'md:opacity-60'
                    )}
                    onClick={() => handleDeleteConversation(conversation)}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className='shrink-0 border-t border-border/40 p-2'>
          <Pagination label={dict.common.paginationLabel}>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  accessibleLabel={dict.common.previousPage}
                  label={dict.common.previousPage}
                  hideLabel={true}
                  onClick={previousPage}
                  disabled={!hasPreviousPage}
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
                  accessibleLabel={dict.common.nextPage}
                  label={dict.common.nextPage}
                  hideLabel={true}
                  onClick={nextPage}
                  disabled={!hasNextPage}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
