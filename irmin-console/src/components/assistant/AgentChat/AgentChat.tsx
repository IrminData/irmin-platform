'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import type { StoredMessage } from '@langchain/core/messages';

import { TbInfoCircle, TbMessageCircle } from 'react-icons/tb';

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
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ui/ai-elements/reasoning';
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

import { ConsolidatedToolMessages } from './ConsolidatedToolMessages';
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
import { renderMessageContent, shouldHideTool } from './utils';

// Helper to create a StoredMessage from streaming data
const createAssistantMessage = (
  content: string,
  parts: ServerStreamEvent[],
  agentId: string,
  messageId?: string
): StoredMessage => {
  // Filter out hidden/internal tools when storing
  const toolCalls = parts.filter((p) => {
    if (
      p.type !== 'tool-input-available' &&
      p.type !== 'tool-output-available'
    ) {
      return false;
    }
    const toolName = (p as { toolName?: string }).toolName;
    return !shouldHideTool(toolName);
  });
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
  showContextBanner,
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

  // Group all assistant messages, tool_calls, and tool_results between user messages together
  // This ensures multi-turn agent interactions (thinking → tool call → result → response) appear in one box
  const groupedMessages = useMemo(() => {
    const groups: StoredMessage[][] = [];
    let currentAssistantGroup: StoredMessage[] = [];

    for (const message of localMessages) {
      const role = getMessageRole(message);

      if (role === 'user') {
        // Finalize any pending assistant group
        if (currentAssistantGroup.length > 0) {
          groups.push([...currentAssistantGroup]);
          currentAssistantGroup = [];
        }
        // Add user message as its own group
        groups.push([message]);
      } else {
        // Assistant messages, tool_calls, tool_results, reasoning - all go in the same group
        currentAssistantGroup.push(message);
      }
    }

    // Handle remaining assistant messages
    if (currentAssistantGroup.length > 0) {
      groups.push([...currentAssistantGroup]);
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
                      {/* Render thinking BEFORE content for assistant messages */}
                      {role === 'assistant' && (
                        <MessageMetadata
                          message={message}
                          agentId={agentId}
                          section='thinking'
                        />
                      )}

                      {renderMessageContent(content, messageType)}

                      {/* Render stored message metadata for different message types */}
                      <StoredMessageMetadata message={message} />

                      {/* Render tools and iterations AFTER content for assistant messages */}
                      {role === 'assistant' && (
                        <MessageMetadata
                          message={message}
                          agentId={agentId}
                          section='tools'
                        />
                      )}

                      {role === 'assistant' &&
                        renderMessageActions(messageId, content)}
                    </MessageContent>
                  </Message>
                );
              }

              // If this is a group of related messages, render them together
              // Groups can contain multiple text messages (initial thought + final response)
              const firstMessage = messageGroup[0];
              const firstMessageId = getMessageId(firstMessage);

              // Separate text messages from tool/reasoning messages
              const textMessages = messageGroup.filter(
                (m) => getMessageType(m) === 'text'
              );
              const toolAndReasoningMessages = messageGroup.filter(
                (m) => getMessageType(m) !== 'text'
              );

              // Combine all text content for the final display
              const allTextContent = textMessages
                .map((m) => getMessageContent(m))
                .filter((c) => c.trim())
                .join('\n\n');

              return (
                <Message key={`group-${firstMessageId}`} from='assistant'>
                  <MessageContent>
                    {/* Render thinking from all text messages */}
                    {textMessages.map((msg, idx) => (
                      <MessageMetadata
                        key={`thinking-${getMessageId(msg)}-${idx}`}
                        message={msg}
                        agentId={agentId}
                        section='thinking'
                      />
                    ))}

                    {/* Render all text message content */}
                    {textMessages.map((msg, idx) => {
                      const content = getMessageContent(msg);
                      if (!content.trim()) return null;
                      return (
                        <div key={`text-${getMessageId(msg)}-${idx}`}>
                          {renderMessageContent(content, 'text')}
                        </div>
                      );
                    })}

                    {/* Render tool calls and reasoning at the bottom (matching streaming behavior) */}
                    <ConsolidatedToolMessages
                      messages={toolAndReasoningMessages}
                    />

                    {/* Actions for the combined message */}
                    {renderMessageActions(
                      getMessageId(
                        textMessages[textMessages.length - 1] || firstMessage
                      ),
                      allTextContent
                    )}
                  </MessageContent>
                </Message>
              );
            })}

          {streamingState.isStreaming && streamingState.streamingMessageId && (
            <Message key={streamingState.streamingMessageId} from='assistant'>
              <MessageContent>
                {/* Thinking/Reasoning at the TOP - streams as it happens */}
                {streamingState.streamingParts.some(
                  (p) => p.type === 'reasoning-end'
                ) && (
                  <div className='mb-4 space-y-2'>
                    {streamingState.streamingParts
                      .filter((p) => p.type === 'reasoning-end')
                      .map((part, index) => (
                        <Reasoning
                          key={`streaming-reasoning-${index}`}
                          defaultOpen={true}
                        >
                          <ReasoningTrigger />
                          <ReasoningContent>
                            {(part as { delta?: string }).delta || ''}
                          </ReasoningContent>
                        </Reasoning>
                      ))}
                  </div>
                )}

                {/* Message content */}
                {streamingState.streamingMessage &&
                  renderMessageContent(streamingState.streamingMessage)}

                {/* Tool calls and errors after content */}
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
                {showContextBanner && (
                  <div
                    className={`
                      mt-4 flex items-center gap-2 rounded-md border
                      border-accent/20 bg-accent/10 p-2 text-xs
                      text-accent-foreground
                    `}
                  >
                    <TbInfoCircle className='size-4 shrink-0' />
                    <span>{dict.assistant.contextAwareBanner}</span>
                  </div>
                )}
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
