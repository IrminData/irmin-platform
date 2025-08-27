'use client';

import { TbChevronRight, TbInfoCircle } from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import { CommonErrorDisplay } from '@/components/ui/error/CommonErrorDisplay';
import ListSkeleton from '@/components/ui/loading/ListSkeleton';

import { useLocale } from '@/context/LocaleContext';

import { useAssistantConversations } from '@/hooks/api/useAssistantConversations';

import { formatTimestamp } from '@/utils/formatTimestamp';

import type { AssistantConversation } from '@/types/core/Assistant';

interface ConversationsListProps {
  selectedConversation?: AssistantConversation | null;
  onSelectConversation: (conversation: AssistantConversation | null) => void;
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

  // Fetch all conversations
  const { assistantConversationsQuery, createAssistantConversationMutation } =
    useAssistantConversations();

  const handleCreateConversation = async () => {
    try {
      const result = await createAssistantConversationMutation.mutateAsync({});
      if (result.data) {
        onSelectConversation(result.data);
        onSidebarClose();
      }
    } catch {
      // Error handling is done in the mutation hook
    }
  };

  const conversations = assistantConversationsQuery.data?.data || [];
  const isLoading = assistantConversationsQuery.isLoading;
  const error = assistantConversationsQuery.error;

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

      {/* Sort conversations by last message date or creation date in descending order */}
      {conversations
        .sort((a: AssistantConversation, b: AssistantConversation) => {
          return (
            new Date(b.last_message_at || b.created_at).getTime() -
            new Date(a.last_message_at || a.created_at).getTime()
          );
        })
        .map((conversation: AssistantConversation) => (
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
              <p className='text-sm'>{conversation.title}</p>
              <p className='text-xs text-foreground/30'>
                {formatTimestamp(
                  conversation.last_message_at || conversation.created_at,
                  locale
                )}
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
                className='p-1'
              >
                <TbInfoCircle size={16} />
              </Button>
              <TbChevronRight size={22} />
            </div>
          </div>
        ))}
    </>
  );
}
