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

import { useAIConversation } from '@/hooks/api/useAIConversation';

import { formatTimestamp } from '@/utils/formatTimestamp';

import type { AIConversation } from '@/types/ai/base';

interface ConversationDetailsProps {
  conversation?: AIConversation | null;
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
    deleteAIConversationMutation,
    handleDeleteConversation: deleteConversation,
  } = useAIConversation(conversation?.id || '');

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
              {formatTimestamp(conversation.createdAt, locale)}
              <br />
              {dict.assistant.lastUpdated}:{' '}
              {formatTimestamp(conversation.updatedAt, locale)}
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
                {conversation?.messageCount ?? 0}
              </Badge>
            </div>
            <div className='flex justify-between'>
              <span className='text-sm font-medium'>
                {dict.assistant.estimatedTokens}:
              </span>
              <Badge variant='outline'>{conversation?.totalTokens ?? 0}</Badge>
            </div>
          </div>
        </div>
        <SheetFooter className='flex-col gap-2'>
          <Button
            variant='destructive'
            size='sm'
            onClick={handleDeleteConversation}
            loading={deleteAIConversationMutation.isPending}
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
