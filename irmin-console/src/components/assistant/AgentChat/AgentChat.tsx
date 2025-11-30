'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import type { StoredMessage } from '@langchain/core/messages';

import { TbMessageCircle } from 'react-icons/tb';

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ui/ai-elements/conversation';
import { Loader } from '@/components/ui/ai-elements/loader';
import { Message, MessageContent } from '@/components/ui/ai-elements/message';
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
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

import { MessageMetadata } from './MessageMetadata';
import { processStream } from './processStream';
import {
  getMessageContent,
  getMessageId,
  getMessageRole,
  getMessageType,
} from './storedMessageHelpers';
import { StoredMessageMetadata } from './StoredMessageMetadata';
import { StreamingMetadata } from './StreamingMetadata';
import type {
  AgentChatProps,
  ServerReasoningEvent,
  ServerStreamEvent,
} from './types';
import { useMessageActions } from './useMessageActions';
import { useStreamingState } from './useStreamingState';
import { renderMessageContent } from './utils';

// Helper to create a StoredMessage from streaming data
const createAssistantMessage = (
  content: string,
  parts: ServerStreamEvent[],
  agentId: string,
  messageId?: string
): StoredMessage => {
  const toolCalls = parts.filter(
    (p) =>
      p.type === 'tool-input-available' || p.type === 'tool-output-available'
  );
  const thinkingSteps = parts
    .filter((p) => p.type === 'reasoning-end')
    .map((p) => (p as ServerReasoningEvent).delta || '');
  const errors = parts.filter(
    (p) => p.type === 'stream-error' || p.type === 'error'
  );

  return {
    type: 'ai',
    data: {
      content: content.trim() || '[Response interrupted]',
      id: messageId || `assistant-${Date.now()}`,
      role: undefined,
      name: undefined,
      tool_call_id: undefined,
      response_metadata: {
        toolCalls,
        thinkingSteps,
        errors,
        agentName: agentId,
      },
    },
  };
};

const AgentChat = ({
  conversationID,
  agentId = 'assistant',
  onConversationCreated,
  onConversationUpdated,
  context,
}: AgentChatProps) => {
  const { dict } = useLocale();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const conversationUpdateTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const [input, setInput] = useState('');
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(conversationID || null);
  const [_pendingUserMessage, setPendingUserMessage] = useState<string | null>(
    null
  );
  const [localMessages, setLocalMessages] = useState<StoredMessage[]>([]);

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
  const initialMessages = useMemo(() => {
    if (!aiConversationMessagesQuery.data || !currentConversationId) {
      return [];
    }
    return aiConversationMessagesQuery.data;
  }, [aiConversationMessagesQuery.data, currentConversationId]);

  // Group related messages (main text + reasoning + tool_call + tool_result) into single displays
  const groupedMessages = useMemo(() => {
    const groups: StoredMessage[][] = [];
    let currentGroup: StoredMessage[] = [];
    let lastAssistantMessage: StoredMessage | null = null;

    for (const message of localMessages) {
      const messageType = getMessageType(message);
      const role = getMessageRole(message);

      // If this is a reasoning, tool_call, or tool_result message, add to current group
      if (
        messageType === 'reasoning' ||
        messageType === 'tool_call' ||
        messageType === 'tool_result'
      ) {
        currentGroup.push(message);
      } else {
        // If we have a current group, finalize it by attaching to the last assistant message
        if (currentGroup.length > 0) {
          if (lastAssistantMessage) {
            // Add the last assistant message to the beginning of the current group
            currentGroup.unshift(lastAssistantMessage);
            groups.push([...currentGroup]);
            lastAssistantMessage = null;
          } else {
            // If no assistant message to attach to, add the group as is
            groups.push([...currentGroup]);
          }
          currentGroup = [];
        }

        // Handle the current message
        if (role === 'assistant' && messageType === 'text') {
          // If we already have a lastAssistantMessage, add it to groups first
          if (lastAssistantMessage) {
            groups.push([lastAssistantMessage]);
          }
          // Store this assistant message to potentially attach tool calls to it
          lastAssistantMessage = message;
        } else {
          // If this is a user message or other type, add it as its own group
          if (lastAssistantMessage) {
            groups.push([lastAssistantMessage]);
            lastAssistantMessage = null;
          }
          groups.push([message]);
        }
      }
    }

    // Handle remaining messages
    if (currentGroup.length > 0) {
      if (lastAssistantMessage) {
        currentGroup.unshift(lastAssistantMessage);
        groups.push([...currentGroup]);
      } else {
        groups.push([...currentGroup]);
      }
    } else if (lastAssistantMessage) {
      groups.push([lastAssistantMessage]);
    }

    return groups;
  }, [localMessages]);

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

      const userMessage: StoredMessage = {
        type: 'human',
        data: {
          content: text,
          id: `user-${Date.now()}`,
          role: undefined,
          name: undefined,
          tool_call_id: undefined,
        },
      };
      setLocalMessages((prev) => [...prev, userMessage]);

      const agentRequest = {
        message: text,
        conversationId: currentConversationId || undefined,
        context, // Pass context to the API request
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
          agentId,
          `assistant-cancelled-${Date.now()}`
        );
        // Add cancelled flag to metadata
        if (cancelledMessage.data.response_metadata) {
          cancelledMessage.data.response_metadata = {
            ...cancelledMessage.data.response_metadata,
            cancelled: true,
          };
        } else {
          cancelledMessage.data.response_metadata = { cancelled: true };
        }
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
          {groupedMessages &&
            groupedMessages.length > 0 &&
            groupedMessages.map((messageGroup: StoredMessage[]) => {
              // If this is a single message, render it normally
              if (messageGroup.length === 1) {
                const message = messageGroup[0];
                const messageId = getMessageId(message);
                const role = getMessageRole(message);
                const content = getMessageContent(message);
                const messageType = getMessageType(message);

                return (
                  <Message key={messageId} from={role}>
                    <MessageContent>
                      {renderMessageContent(content, messageType)}

                      {/* Render stored message metadata for different message types */}
                      <StoredMessageMetadata message={message} />

                      {/* Render agent graph metadata for assistant messages */}
                      <MessageMetadata message={message} agentId={agentId} />

                      {role === 'assistant' &&
                        renderMessageActions(messageId, content)}
                    </MessageContent>
                  </Message>
                );
              }

              // If this is a group of related messages, render them together
              const firstMessage = messageGroup[0];
              const firstMessageId = getMessageId(firstMessage);
              const firstMessageRole = getMessageRole(firstMessage);
              const mainTextMessage = messageGroup.find(
                (m) => getMessageType(m) === 'text'
              );
              const otherMessages = messageGroup.filter(
                (m) => getMessageType(m) !== 'text'
              );

              return (
                <Message
                  key={`group-${firstMessageId}`}
                  from={firstMessageRole}
                >
                  <MessageContent>
                    {/* Render main text message content if it exists */}
                    {mainTextMessage && (
                      <>
                        {renderMessageContent(
                          getMessageContent(mainTextMessage),
                          getMessageType(mainTextMessage)
                        )}

                        {/* Always render metadata, but MessageMetadata will handle tool call conflicts */}
                        <MessageMetadata
                          message={mainTextMessage}
                          agentId={agentId}
                          hasStoredToolMessages={otherMessages.some(
                            (m) =>
                              getMessageType(m) === 'tool_call' ||
                              getMessageType(m) === 'tool_result'
                          )}
                        />

                        {getMessageRole(mainTextMessage) === 'assistant' &&
                          renderMessageActions(
                            getMessageId(mainTextMessage),
                            getMessageContent(mainTextMessage)
                          )}
                      </>
                    )}

                    {/* Render other messages (reasoning, tool calls, tool results) */}
                    {otherMessages.map((message: StoredMessage) => (
                      <StoredMessageMetadata
                        key={`${getMessageId(message)}-${getMessageType(message)}`}
                        message={message}
                      />
                    ))}
                  </MessageContent>
                </Message>
              );
            })}

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

          {(!currentConversationId || localMessages.length === 0) &&
            !streamingState.isStreaming &&
            !executeAgentStreamMutation.isPending && (
              <div
                className={`
                  flex h-full flex-col items-center justify-center p-4
                `}
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
        <PromptInputToolbar className='justify-end'>
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
          suggestion={dict.assistant.querySyntaxExamples}
          onClick={handleSuggestionClick}
          size='sm'
        />
        <Suggestion
          suggestion={dict.assistant.whatIsIrmin}
          onClick={handleSuggestionClick}
          size='sm'
        />
        <Suggestion
          suggestion={dict.assistant.whatRepositoriesDoIHave}
          onClick={handleSuggestionClick}
          size='sm'
        />
        <Suggestion
          suggestion={dict.assistant.whatConnectionsAndWorkflowsDoIHave}
          onClick={handleSuggestionClick}
          size='sm'
        />
      </Suggestions>
    </div>
  );
};

export default AgentChat;
