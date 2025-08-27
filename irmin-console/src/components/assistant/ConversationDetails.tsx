'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

import { useLocale } from '@/context/LocaleContext';

import { useAssistantConversation } from '@/hooks/api/useAssistantConversation';

import { formatTimestamp } from '@/utils/formatTimestamp';

import type { AssistantConversation } from '@/types/core/Assistant';

interface ConversationDetailsProps {
  conversation?: AssistantConversation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCloseConversation: () => void;
}

export default function ConversationDetails({
  conversation,
  open,
  onOpenChange,
  onCloseConversation,
}: ConversationDetailsProps) {
  const { locale, dict } = useLocale();
  const {
    clearAssistantConversationMutation,
    deleteAssistantConversationMutation,
    handleDeleteConversation: deleteConversation,
  } = useAssistantConversation(conversation?.id || '');

  const handleClearConversation = () => {
    if (conversation?.id) {
      clearAssistantConversationMutation.mutate(conversation.id);
    }
  };

  const handleDeleteConversation = () => {
    deleteConversation();
    onCloseConversation();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side='right' className='w-80'>
        <SheetHeader>
          <SheetTitle>{conversation?.title || dict.assistant.title}</SheetTitle>
          {conversation && (
            <SheetDescription>
              {dict.assistant.created}:{' '}
              {formatTimestamp(conversation.created_at, locale)}
              <br />
              {dict.assistant.lastUpdated}:{' '}
              {formatTimestamp(conversation.updated_at, locale)}
              {conversation.last_message_at && (
                <>
                  <br />
                  {dict.assistant.lastMessage}:{' '}
                  {formatTimestamp(conversation.last_message_at, locale)}
                </>
              )}
            </SheetDescription>
          )}
        </SheetHeader>
        <div className='grid flex-1 auto-rows-min gap-6 p-4'>
          <div className='space-y-3'>
            <div className='flex justify-between'>
              <span className='text-sm font-medium'>
                {dict.assistant.totalMessages}:
              </span>
              <Badge variant='secondary'>
                {conversation?.total_messages ?? 0}
              </Badge>
            </div>
            <div className='flex justify-between'>
              <span className='text-sm font-medium'>
                {dict.assistant.userMessages}:
              </span>
              <Badge variant='outline'>
                {conversation?.user_messages ?? 0}
              </Badge>
            </div>
            <div className='flex justify-between'>
              <span className='text-sm font-medium'>
                {dict.assistant.assistantMessages}:
              </span>
              <Badge variant='outline'>
                {conversation?.assistant_messages ?? 0}
              </Badge>
            </div>
            <div className='flex justify-between'>
              <span className='text-sm font-medium'>
                {dict.assistant.estimatedTokens}:
              </span>
              <Badge variant='outline'>
                {conversation?.estimated_tokens ?? 0}
              </Badge>
            </div>
          </div>
        </div>
        <SheetFooter className='flex-col gap-2'>
          <Button
            variant='ghost'
            size='sm'
            onClick={handleClearConversation}
            loading={clearAssistantConversationMutation.isPending}
            disabled={!conversation}
          >
            {dict.assistant.clearConversation}
          </Button>
          <Button
            variant='destructive'
            size='sm'
            onClick={handleDeleteConversation}
            loading={deleteAssistantConversationMutation.isPending}
            disabled={!conversation}
          >
            {dict.assistant.deleteConversation}
          </Button>
          <SheetClose asChild>
            <Button variant='outline' size='sm'>
              {dict.common.close}
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
