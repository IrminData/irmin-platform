'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { TbGlobe, TbMessageCircle } from 'react-icons/tb';

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ui/ai-elements/conversation';
import { Loader } from '@/components/ui/ai-elements/loader';
import { Message, MessageContent } from '@/components/ui/ai-elements/message';
import {
  PromptInput,
  PromptInputButton,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from '@/components/ui/ai-elements/prompt-input';
import {
  Suggestion,
  Suggestions,
} from '@/components/ui/ai-elements/suggestion';
import { EmptyState } from '@/components/ui/EmptyState';
import { CommonErrorDisplay } from '@/components/ui/error/CommonErrorDisplay';
import ListSkeleton from '@/components/ui/loading/ListSkeleton';

import { useLocale } from '@/context/LocaleContext';

import { useAIAgent } from '@/hooks/api/useAIAgent';
import { useAIConversation } from '@/hooks/api/useAIConversation';

import type { AIMessage } from '@/types/ai/base';

import { createAssistantMessage } from './createAssistantMessage';
import { MessageMetadata } from './MessageMetadata';
import { processStream } from './processStream';
import { StreamingMetadata } from './StreamingMetadata';
import type { AgentChatProps } from './types';
import { useMessageActions } from './useMessageActions';
import { useStreamingState } from './useStreamingState';
import { renderMessageContent } from './utils';

const AgentChat = ({
  conversationID,
  agentId = 'assistant',
  onConversationCreated,
  onConversationUpdated,
}: AgentChatProps) => {
  const { dict } = useLocale();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const conversationUpdateTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const [webSearch, setWebSearch] = useState(false);
  const [input, setInput] = useState('');
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(conversationID || null);
  const [_pendingUserMessage, setPendingUserMessage] = useState<string | null>(
    null
  );
  const [localMessages, setLocalMessages] = useState<AIMessage[]>([]);

  // Use extracted hooks
  const streamingState = useStreamingState();
  const { renderMessageActions } = useMessageActions();

  // Use agent hooks for conversation management and agent execution
  const shouldEnableQueries =
    !!currentConversationId && localMessages.length === 0;

  const { aiConversationQuery, aiConversationMessagesQuery } =
    useAIConversation(currentConversationId || '', {
      enabled: shouldEnableQueries,
    });
  const { executeAgentStreamMutation } = useAIAgent(agentId);

  // Get messages from the conversation query
  const initialMessages = useMemo(
    () => aiConversationMessagesQuery.data?.data || [],
    [aiConversationMessagesQuery.data?.data]
  );

  // Update local messages when initial messages are loaded
  useEffect(() => {
    if (initialMessages.length > 0 && localMessages.length === 0) {
      setLocalMessages(initialMessages);
    }
  }, [initialMessages, localMessages.length]);

  // Reset local messages when conversation changes
  useEffect(() => {
    if (conversationID !== currentConversationId) {
      // Only clear messages if we're switching between two different non-null conversation IDs
      if (
        conversationID &&
        currentConversationId &&
        conversationID !== currentConversationId
      ) {
        setLocalMessages([]);
      }
      setCurrentConversationId(conversationID || null);
    }
  }, [conversationID, currentConversationId]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    let responseConversationId: string | null = null;

    try {
      setInput('');
      streamingState.setIsStreaming(true);
      streamingState.setStreamingMessage('');
      streamingState.setStreamingParts([]);
      streamingState.setStreamingMessageId(`temp-${Date.now()}`);
      setPendingUserMessage(null);

      const controller = new AbortController();
      streamingState.setAbortController(controller);

      const userMessage: AIMessage = {
        id: `user-${Date.now()}`,
        conversationId: currentConversationId || '',
        role: 'user',
        content: text,
        metadata: {},
        messageType: 'text',
        blockId: null,
        parentBlockId: null,
        blockOrder: 0,
        aiModelId: null,
        modelProvider: null,
        modelName: null,
        agentName: null,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        costUSD: 0,
        processingTimeMs: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setLocalMessages((prev) => [...prev, userMessage]);

      const agentRequest = {
        message: text,
        conversationId: currentConversationId || undefined,
        metadata: {
          webSearch,
        },
      };

      const response = await executeAgentStreamMutation.mutateAsync({
        agentId,
        request: agentRequest,
      });

      responseConversationId = response.conversationId || currentConversationId;

      if (
        response.stream &&
        typeof (response.stream as ReadableStream).getReader === 'function'
      ) {
        const { content, parts } = await processStream(
          response.stream as ReadableStream,
          controller.signal,
          streamingState.setStreamingMessage,
          streamingState.setStreamingParts
        );

        const assistantMessage = createAssistantMessage(
          content,
          parts,
          currentConversationId,
          agentId
        );
        setLocalMessages((prev) => [...prev, assistantMessage]);
      }

      if (!currentConversationId && response.conversationId) {
        setCurrentConversationId(response.conversationId);
        if (onConversationCreated) {
          onConversationCreated(response.conversationId);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);

      // If there was streaming content, preserve it even on error
      if (streamingState.streamingMessage.trim()) {
        const errorMessage = createAssistantMessage(
          streamingState.streamingMessage.trim() ||
            '[Response interrupted due to error]',
          [
            ...streamingState.streamingParts.filter(
              (p) => p.type === 'stream-error' || p.type === 'error'
            ),
            {
              type: 'error',
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          ],
          currentConversationId,
          agentId,
          `assistant-error-${Date.now()}`
        );
        setLocalMessages((prev) => [...prev, errorMessage]);
      }
    } finally {
      streamingState.resetStreamingState();
      setPendingUserMessage(null);

      const conversationIdToUpdate =
        responseConversationId || currentConversationId;
      if (onConversationUpdated && conversationIdToUpdate) {
        // Clear any existing timeout to prevent race conditions
        if (conversationUpdateTimeoutRef.current) {
          clearTimeout(conversationUpdateTimeoutRef.current);
        }

        // Schedule conversation update with proper cleanup
        conversationUpdateTimeoutRef.current = setTimeout(() => {
          onConversationUpdated(conversationIdToUpdate);
          conversationUpdateTimeoutRef.current = null;
        }, 2000);
      }
    }
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (conversationUpdateTimeoutRef.current) {
        clearTimeout(conversationUpdateTimeoutRef.current);
      }
    };
  }, []);

  // Toggle the web search state
  const handleToggleWebSearch = () => {
    setWebSearch(!webSearch);
  };

  // Set the input to the suggestion on click
  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  const handleCancelStream = () => {
    if (streamingState.abortController) {
      streamingState.abortController.abort();

      // Preserve any streaming content before clearing
      if (streamingState.streamingMessage.trim()) {
        const cancelledMessage = createAssistantMessage(
          streamingState.streamingMessage.trim() +
            '\n\n[Response cancelled by user]',
          streamingState.streamingParts,
          currentConversationId,
          agentId,
          `assistant-cancelled-${Date.now()}`
        );
        // Add cancelled flag to metadata
        cancelledMessage.metadata = {
          ...cancelledMessage.metadata,
          cancelled: true,
        };
        setLocalMessages((prev) => [...prev, cancelledMessage]);
      }

      streamingState.resetStreamingState();
    }
  };

  if (shouldEnableQueries && aiConversationQuery.isLoading) {
    return <ListSkeleton items={6} className='p-2' />;
  }

  if (shouldEnableQueries && aiConversationQuery.error) {
    return (
      <CommonErrorDisplay
        error={aiConversationQuery.error}
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
    <div
      className={`
        flex h-full flex-col px-0 pb-6
        xl:px-4
      `}
    >
      <Conversation className='flex-1'>
        <ConversationContent>
          {localMessages &&
            localMessages.length > 0 &&
            localMessages.map((message: AIMessage) => (
              <Message key={message.id} from={message.role}>
                <MessageContent>
                  {renderMessageContent(message.content)}

                  {/* Render agent graph metadata for assistant messages */}
                  <MessageMetadata message={message} agentId={agentId} />

                  {message.role === 'assistant' &&
                    renderMessageActions(message.id, message.content)}
                </MessageContent>
              </Message>
            ))}

          {streamingState.isStreaming && streamingState.streamingMessageId && (
            <Message key={streamingState.streamingMessageId} from='assistant'>
              <MessageContent>
                {streamingState.streamingMessage &&
                  renderMessageContent(streamingState.streamingMessage)}

                <StreamingMetadata
                  streamingParts={streamingState.streamingParts}
                />

                {streamingState.streamingMessage &&
                  renderMessageActions(
                    streamingState.streamingMessageId!,
                    streamingState.streamingMessage
                  )}
              </MessageContent>
            </Message>
          )}

          {(streamingState.isStreaming ||
            executeAgentStreamMutation.isPending) && <Loader />}

          {(!currentConversationId ||
            !localMessages ||
            localMessages.length === 0) && (
            <div
              className={`flex h-full flex-col items-center justify-center p-4`}
            >
              <EmptyState
                icon={<TbMessageCircle className='size-full' />}
                title={
                  !currentConversationId
                    ? dict.assistant.newConversation
                    : dict.assistant.noMessagesInTheConversation
                }
                description={
                  !currentConversationId
                    ? dict.assistant.noConversationSelectedDescription
                    : dict.assistant.noMessagesInTheConversationDescription
                }
                size='sm'
              />
            </div>
          )}
        </ConversationContent>

        <ConversationScrollButton />
      </Conversation>

      <PromptInput onSubmit={handleSubmit}>
        <PromptInputTextarea
          ref={textareaRef}
          onChange={handleInputChange}
          value={input}
          placeholder={dict.assistant.askMeAnything}
        />
        <PromptInputToolbar>
          <PromptInputTools>
            <PromptInputButton
              variant={webSearch ? 'default' : 'ghost'}
              onClick={handleToggleWebSearch}
              title={dict.assistant.toggleWebSearch}
            >
              <TbGlobe size={16} />
              <span>{dict.assistant.search}</span>
            </PromptInputButton>
          </PromptInputTools>
          <PromptInputSubmit
            disabled={
              !input &&
              !streamingState.isStreaming &&
              !executeAgentStreamMutation.isPending
            }
            status={
              streamingState.isStreaming || executeAgentStreamMutation.isPending
                ? 'streaming'
                : undefined
            }
            onClick={
              streamingState.isStreaming || executeAgentStreamMutation.isPending
                ? handleCancelStream
                : undefined
            }
          />
        </PromptInputToolbar>
      </PromptInput>

      <Suggestions className='mt-2'>
        <Suggestion
          suggestion={dict.assistant.showCodeExamples}
          onClick={handleSuggestionClick}
          size='sm'
        />
        <Suggestion
          suggestion={dict.assistant.explainBusinessConcepts}
          onClick={handleSuggestionClick}
          size='sm'
        />
        <Suggestion
          suggestion={dict.assistant.analyzeMarketTrends}
          onClick={handleSuggestionClick}
          size='sm'
        />
      </Suggestions>
    </div>
  );
};

export default AgentChat;
