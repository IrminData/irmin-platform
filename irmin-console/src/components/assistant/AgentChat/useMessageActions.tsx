import { JSX, useState } from 'react';

import { TbCopy, TbThumbDown, TbThumbUp } from 'react-icons/tb';

import { Action, Actions } from '@/components/ui/ai-elements/actions';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import type { MessageActions } from './types';

interface UseMessageActionsReturn {
  messageActions: MessageActions;
  renderMessageActions: (messageId: string, content: string) => JSX.Element;
}

export const useMessageActions = (): UseMessageActionsReturn => {
  const { dict } = useLocale();
  const { irminAlert } = usePopup();
  const [messageActions, setMessageActions] = useState<MessageActions>({});

  const handleLike = (messageId: string) => {
    setMessageActions((prev) => ({
      ...prev,
      [messageId]: { ...prev[messageId], liked: true, disliked: false },
    }));
  };

  const handleDislike = (messageId: string) => {
    setMessageActions((prev) => ({
      ...prev,
      [messageId]: { ...prev[messageId], liked: false, disliked: true },
    }));
  };

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      irminAlert('success', dict.assistant.messageCopied);
    } catch (error) {
      console.error('Failed to copy message:', error);
      irminAlert('error', dict.assistant.copyFailed);
    }
  };

  const renderMessageActions = (messageId: string, content: string) => {
    const messageState = messageActions[messageId] || {};

    return (
      <Actions className='mt-2'>
        <Action
          tooltip={dict.assistant.likeThisResponse}
          onClick={() => handleLike(messageId)}
          variant={messageState.liked ? 'default' : 'ghost'}
        >
          <TbThumbUp size={16} />
        </Action>
        <Action
          tooltip={dict.assistant.dislikeThisResponse}
          onClick={() => handleDislike(messageId)}
          variant={messageState.disliked ? 'default' : 'ghost'}
        >
          <TbThumbDown size={16} />
        </Action>
        <Action
          tooltip={dict.assistant.copyMessage}
          onClick={() => handleCopy(content)}
        >
          <TbCopy size={16} />
        </Action>
      </Actions>
    );
  };

  return {
    messageActions,
    renderMessageActions,
  };
};
