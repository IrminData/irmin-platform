import { JSX, useEffect, useState } from 'react';

import { TbCopy, TbThumbDown, TbThumbUp } from 'react-icons/tb';

import { Action, Actions } from '@/components/ui/ai-elements/actions';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { MessageActions } from './types';

interface UseMessageActionsReturn {
  messageActions: MessageActions;
  renderMessageActions: (messageId: string, content: string) => JSX.Element;
}

export const useMessageActions = (
  conversationId: string | null
): UseMessageActionsReturn => {
  const { dict } = useLocale();
  const { irminAlert } = usePopup();
  const { getToken } = useIAM();
  const { workspaceSlug } = useWorkspaceContext();
  const [feedbackState, setFeedbackState] = useState<{
    conversationId: string;
    actions: MessageActions;
  }>({ conversationId: '', actions: {} });
  const messageActions =
    feedbackState.conversationId === conversationId
      ? feedbackState.actions
      : {};

  useEffect(() => {
    if (!conversationId) {
      return;
    }
    const controller = new AbortController();
    void (async () => {
      try {
        const token = await getToken();
        const response = await fetch(
          `/api/ai/conversations/${conversationId}/feedback`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'X-Workspace-Slug': workspaceSlug,
            },
            signal: controller.signal,
          }
        );
        if (!response.ok) throw new Error('Failed to load feedback');
        const feedback = (await response.json()) as Array<{
          messageId: string;
          rating: number;
        }>;
        setFeedbackState({
          conversationId,
          actions: Object.fromEntries(
            feedback.map((item) => [
              item.messageId,
              { liked: item.rating === 1, disliked: item.rating === -1 },
            ])
          ),
        });
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Failed to load message feedback:', error);
        }
      }
    })();
    return () => controller.abort();
  }, [conversationId, getToken, workspaceSlug]);

  const saveFeedback = async (messageId: string, rating: 1 | -1) => {
    if (!conversationId) return;
    const previous = messageActions[messageId];
    setFeedbackState((current) => ({
      conversationId,
      actions: {
        ...(current.conversationId === conversationId ? current.actions : {}),
        [messageId]: { liked: rating === 1, disliked: rating === -1 },
      },
    }));
    try {
      const token = await getToken();
      const response = await fetch(
        `/api/ai/conversations/${conversationId}/feedback`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Workspace-Slug': workspaceSlug,
          },
          body: JSON.stringify({ messageId, rating }),
        }
      );
      if (!response.ok) throw new Error('Failed to save feedback');
    } catch (_error) {
      setFeedbackState((current) => ({
        conversationId,
        actions: {
          ...(current.conversationId === conversationId ? current.actions : {}),
          [messageId]: previous ?? {},
        },
      }));
      irminAlert('error', dict.common.somethingWentWrong);
    }
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
          onClick={() => void saveFeedback(messageId, 1)}
          variant={messageState.liked ? 'default' : 'ghost'}
        >
          <TbThumbUp size={16} />
        </Action>
        <Action
          tooltip={dict.assistant.dislikeThisResponse}
          onClick={() => void saveFeedback(messageId, -1)}
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
