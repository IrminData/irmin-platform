'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import {
  CopyIcon,
  GlobeIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
} from 'lucide-react';

import { TbMessageCircle } from 'react-icons/tb';

import { Action, Actions } from '@/components/ui/ai-elements/actions';
import {
  CodeBlock,
  CodeBlockCopyButton,
} from '@/components/ui/ai-elements/code-block';
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
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ui/ai-elements/reasoning';
import { Response } from '@/components/ui/ai-elements/response';
import {
  Suggestion,
  Suggestions,
} from '@/components/ui/ai-elements/suggestion';
import { EmptyState } from '@/components/ui/EmptyState';
import { CommonErrorDisplay } from '@/components/ui/error/CommonErrorDisplay';
import ListSkeleton from '@/components/ui/loading/ListSkeleton';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { useAIAgent } from '@/hooks/api/useAIAgent';
import { useAIConversation } from '@/hooks/api/useAIConversation';

import type { AIMessage } from '@/types/ai/base';

interface AgentChatProps {
  conversationID?: string | null;
  agentId?: string; // Which agent to use (defaults to 'chat' - general assistant)
  onConversationCreated?: (conversationId: string) => void; // Callback when new conversation is created
}

// Helper function to detect and render code blocks
const renderMessageContent = (content: string) => {
  // Simple markdown code block detection
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      const textBefore = content.substring(lastIndex, match.index);
      if (textBefore.trim()) {
        parts.push(<Response key={`text-${lastIndex}`}>{textBefore}</Response>);
      }
    }

    // Add code block
    const language = match[1] || 'text';
    const code = match[2];
    parts.push(
      <CodeBlock key={`code-${match.index}`} code={code} language={language}>
        <CodeBlockCopyButton />
      </CodeBlock>
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    const remainingText = content.substring(lastIndex);
    if (remainingText.trim()) {
      parts.push(
        <Response key={`text-${lastIndex}`}>{remainingText}</Response>
      );
    }
  }

  // If no code blocks found, return as simple response
  if (parts.length === 0) {
    return <Response>{content}</Response>;
  }

  return <>{parts}</>;
};

// Helper function to render tool calls
const renderToolCall = (toolCall: Record<string, unknown>, index: number) => {
  return (
    <div key={`tool-${index}`} className='mb-4 rounded-md border p-4'>
      <div className='mb-2 font-medium'>
        🔧 {(toolCall.name as string) || 'Tool Call'}
      </div>
      {toolCall.input !== undefined && (
        <div className='mb-2'>
          <div className='mb-1 text-sm font-medium text-muted-foreground'>
            Input:
          </div>
          <pre className='overflow-auto rounded bg-muted p-2 text-xs'>
            {JSON.stringify(toolCall.input as Record<string, unknown>, null, 2)}
          </pre>
        </div>
      )}
      {toolCall.output !== undefined && (
        <div>
          <div className='mb-1 text-sm font-medium text-muted-foreground'>
            Output:
          </div>
          <pre className='overflow-auto rounded bg-muted p-2 text-xs'>
            {String(toolCall.output as string)}
          </pre>
        </div>
      )}
    </div>
  );
};

const AgentChat = ({
  conversationID,
  agentId = 'chat',
  onConversationCreated,
}: AgentChatProps) => {
  const { dict } = useLocale();
  const { irminAlert } = usePopup();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [webSearch, setWebSearch] = useState(false);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<string>('');
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null
  );
  const [streamingParts, setStreamingParts] = useState<
    Record<string, unknown>[]
  >([]);
  const [messageActions, setMessageActions] = useState<
    Record<string, { liked?: boolean; disliked?: boolean }>
  >({});
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(conversationID || null);
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(
    null
  );

  // Use agent hooks for conversation management and agent execution
  const { aiConversationQuery, aiConversationMessagesQuery } =
    useAIConversation(currentConversationId || '');
  const { executeAgentStreamMutation } = useAIAgent(agentId);

  // Get messages from the conversation query
  const messages = useMemo(
    () => aiConversationMessagesQuery.data?.data || [],
    [aiConversationMessagesQuery.data?.data]
  );

  // Update current conversation ID when prop changes
  useEffect(() => {
    setCurrentConversationId(conversationID || null);
  }, [conversationID]);

  // Helper function to render message actions
  const renderMessageActions = (messageId: string, content: string) => {
    const handleLike = () => {
      setMessageActions((prev) => ({
        ...prev,
        [messageId]: { ...prev[messageId], liked: true, disliked: false },
      }));
    };

    const handleDislike = () => {
      setMessageActions((prev) => ({
        ...prev,
        [messageId]: { ...prev[messageId], liked: false, disliked: true },
      }));
    };

    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(content);
        irminAlert('success', dict.assistant.messageCopied);
      } catch (error) {
        console.error('Failed to copy message:', error);
        irminAlert('error', dict.assistant.copyFailed);
      }
    };

    const messageState = messageActions[messageId] || {};

    return (
      <Actions className='mt-2'>
        <Action
          tooltip='Like this response'
          onClick={handleLike}
          variant={messageState.liked ? 'default' : 'ghost'}
        >
          <ThumbsUpIcon size={16} />
        </Action>
        <Action
          tooltip='Dislike this response'
          onClick={handleDislike}
          variant={messageState.disliked ? 'default' : 'ghost'}
        >
          <ThumbsDownIcon size={16} />
        </Action>
        <Action tooltip={dict.assistant.copyMessage} onClick={handleCopy}>
          <CopyIcon size={16} />
        </Action>
      </Actions>
    );
  };

  // Helper function to render reasoning
  const renderReasoning = (
    reasoning: Record<string, unknown>,
    index: number
  ) => {
    return (
      <Reasoning key={`reasoning-${index}`} defaultOpen={false}>
        <ReasoningTrigger />
        <ReasoningContent>
          {(reasoning.content as string) || (reasoning.text as string)}
        </ReasoningContent>
      </Reasoning>
    );
  };

  // Process streaming response chunks
  const processStream = async (stream: ReadableStream) => {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let content = '';
    const parts: Record<string, unknown>[] = [];

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter((line) => line.trim());

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);

            // Handle different chunk types
            switch (parsed.type) {
              case 'text-delta':
                if (parsed.delta) {
                  content += parsed.delta;
                  setStreamingMessage(content);
                }
                break;
              case 'tool-call':
                parts.push(parsed);
                setStreamingParts([...parts]);
                break;
              case 'tool-result':
                parts.push(parsed);
                setStreamingParts([...parts]);
                break;
              case 'reasoning':
                parts.push(parsed);
                setStreamingParts([...parts]);
                break;
              default:
                // Handle any other chunk types
                parts.push(parsed);
                setStreamingParts([...parts]);
                break;
            }
          } catch {
            // Skip invalid JSON chunks
            continue;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return content;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    try {
      setInput('');
      setIsStreaming(true);
      setStreamingMessage('');
      setStreamingParts([]);
      setStreamingMessageId(`temp-${Date.now()}`);
      setPendingUserMessage(text);

      // Execute the specific agent with streaming
      const agentRequest = {
        message: text,
        conversationId: currentConversationId || undefined,
        // Add any agent-specific metadata
        metadata: {
          webSearch,
        },
      };

      const response = await executeAgentStreamMutation.mutateAsync({
        agentId,
        request: agentRequest,
      });

      // Process stream if present (avoid instanceof checks that can fail across realms)
      if (
        response.stream &&
        typeof (response.stream as ReadableStream).getReader === 'function'
      ) {
        await processStream(response.stream as ReadableStream);
      }

      // Check if a new conversation was created (when conversationID was null)
      if (!currentConversationId && response.conversationId) {
        setCurrentConversationId(response.conversationId);
        if (onConversationCreated) {
          onConversationCreated(response.conversationId);
        }
      }

      // Refetch messages after completion if we have a conversation ID
      if (currentConversationId || response.conversationId) {
        const conversationToRefetch =
          response.conversationId || currentConversationId;
        if (conversationToRefetch) {
          // Keep streaming state until refetch completes to avoid flash
          await aiConversationMessagesQuery.refetch();
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsStreaming(false);
      setStreamingMessage('');
      setStreamingParts([]);
      setStreamingMessageId(null);
      setPendingUserMessage(null);
    }
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  useEffect(() => {
    // Optional auto-focus
    textareaRef.current?.focus();
  }, []);

  // Toggle the web search state
  const handleToggleWebSearch = () => {
    setWebSearch(!webSearch);
  };

  // Set the input to the suggestion on click
  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  // Show loading state while fetching conversation (only if we have a conversation ID)
  if (currentConversationId && aiConversationQuery.isLoading) {
    return <ListSkeleton items={6} className='p-2' />;
  }

  // Show error state if conversation fetch failed (only if we have a conversation ID)
  if (currentConversationId && aiConversationQuery.error) {
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
          {messages &&
            messages.length > 0 &&
            messages.map((message: AIMessage) => (
              <Message key={message.id} from={message.role}>
                <MessageContent>
                  {renderMessageContent(message.content)}
                  {/* Add action buttons for assistant messages */}
                  {message.role === 'assistant' &&
                    renderMessageActions(message.id, message.content)}
                </MessageContent>
              </Message>
            ))}

          {/* Show pending user message while request is being processed */}
          {pendingUserMessage && (
            <Message key='pending-user' from='user'>
              <MessageContent>
                <Response>{pendingUserMessage}</Response>
              </MessageContent>
            </Message>
          )}

          {/* Show streaming message in real-time */}
          {isStreaming && streamingMessageId && (
            <Message key={streamingMessageId} from='assistant'>
              <MessageContent>
                {/* Render any tool calls or reasoning first */}
                {streamingParts.map((part, index) => {
                  if (
                    part.type === 'tool-call' ||
                    part.type === 'tool-result'
                  ) {
                    return renderToolCall(part, index);
                  }
                  if (part.type === 'reasoning') {
                    return renderReasoning(part, index);
                  }
                  return null;
                })}

                {/* Render streaming text content */}
                {streamingMessage && renderMessageContent(streamingMessage)}
                {/* Add action buttons for streaming message */}
                {streamingMessage &&
                  renderMessageActions(streamingMessageId!, streamingMessage)}
              </MessageContent>
            </Message>
          )}

          {(isStreaming ||
            executeAgentStreamMutation.isPending ||
            (currentConversationId &&
              aiConversationMessagesQuery.isLoading)) && <Loader />}

          {(!currentConversationId || !messages || messages.length === 0) && (
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
                size='md'
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
              <GlobeIcon size={16} />
              <span>{dict.assistant.search}</span>
            </PromptInputButton>
          </PromptInputTools>
          <PromptInputSubmit
            disabled={
              !input || isStreaming || executeAgentStreamMutation.isPending
            }
            status={
              isStreaming || executeAgentStreamMutation.isPending
                ? 'streaming'
                : 'ready'
            }
          />
        </PromptInputToolbar>
      </PromptInput>

      <Suggestions className='mt-2'>
        <Suggestion
          suggestion={dict.assistant.showCodeExamples}
          onClick={handleSuggestionClick}
        />
        <Suggestion
          suggestion={dict.assistant.explainBusinessConcepts}
          onClick={handleSuggestionClick}
        />
        <Suggestion
          suggestion={dict.assistant.helpWithWriting}
          onClick={handleSuggestionClick}
        />
        <Suggestion
          suggestion={dict.assistant.analyzeMarketTrends}
          onClick={handleSuggestionClick}
        />
      </Suggestions>
    </div>
  );
};

export default AgentChat;
