'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import type { ChatStatus } from 'ai';
import { GlobeIcon } from 'lucide-react';

import { TbMessageCircle } from 'react-icons/tb';

import {
  Branch,
  BranchMessages,
  BranchNext,
  BranchPage,
  BranchPrevious,
  BranchSelector,
} from '@/components/ui/ai-elements/branch';
import {
  CodeBlock,
  CodeBlockCopyButton,
} from '@/components/ui/ai-elements/code-block';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ui/ai-elements/conversation';
import { Image } from '@/components/ui/ai-elements/image';
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
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from '@/components/ui/ai-elements/source';
import {
  Suggestion,
  Suggestions,
} from '@/components/ui/ai-elements/suggestion';
import {
  Task,
  TaskContent,
  TaskItem,
  TaskTrigger,
} from '@/components/ui/ai-elements/task';
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from '@/components/ui/ai-elements/tool';
import {
  WebPreview,
  WebPreviewBody,
  WebPreviewConsole,
  WebPreviewNavigation,
  WebPreviewNavigationButton,
  WebPreviewUrl,
} from '@/components/ui/ai-elements/web-preview';
import { EmptyState } from '@/components/ui/EmptyState';
import { CommonErrorDisplay } from '@/components/ui/error/CommonErrorDisplay';
import ListSkeleton from '@/components/ui/loading/ListSkeleton';

import { useLocale } from '@/context/LocaleContext';

import { useAssistantConversation } from '@/hooks/api/useAssistantConversation';

import type { AssistantMessage } from '@/types/core/Assistant';

type Part =
  | { type: 'text'; text: string }
  | { type: 'reasoning'; text: string }
  | { type: 'source-url'; url: string }
  | { type: 'code'; code: string; language: string }
  | { type: 'image'; base64: string; alt: string }
  | {
      type: 'tool';
      toolName: string;
      input: Record<string, unknown>;
      output: Record<string, unknown>;
      state:
        | 'input-streaming'
        | 'input-available'
        | 'output-available'
        | 'output-error';
    }
  | { type: 'task'; title: string; items: string[] }
  | { type: 'branch'; branches: string[] }
  | {
      type: 'web-preview';
      url: string;
      logs: Array<{
        level: 'log' | 'warn' | 'error';
        message: string;
        timestamp: Date;
      }>;
    };

interface AssistantChatProps {
  conversationID?: string | null;
}

const transformMessageToParts = (message: AssistantMessage): Part[] => {
  const parts: Part[] = [];

  // Transform the message content based on contentType
  switch (message.content_type) {
    case 'text':
      parts.push({ type: 'text', text: message.content });
      break;
    case 'thinking':
      parts.push({ type: 'reasoning', text: message.content });
      break;
    case 'tool_use':
      // Parse tool use content and create tool part
      try {
        const toolData = JSON.parse(message.content);
        parts.push({
          type: 'tool',
          toolName: toolData.toolName || 'Tool',
          input: toolData.input || {},
          output: toolData.output || {},
          state: 'output-available',
        });
      } catch {
        // Fallback to text if parsing fails
        parts.push({ type: 'text', text: message.content });
      }
      break;
    case 'code_execution_tool_result':
      // Parse code execution result and create code part
      try {
        const codeData = JSON.parse(message.content);
        parts.push({
          type: 'code',
          code: codeData.code || message.content,
          language: codeData.language || 'text',
        });
      } catch {
        parts.push({ type: 'text', text: message.content });
      }
      break;
    default:
      // Default to text for unknown content types
      parts.push({ type: 'text', text: message.content });
  }

  return parts;
};

const AssistantChat = ({ conversationID }: AssistantChatProps) => {
  const { dict } = useLocale();
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [webSearch, setWebSearch] = useState(false);

  // Use the hook to fetch conversation details and handle message sending
  const { assistantConversationQuery, sendMessageMutation } =
    useAssistantConversation(conversationID || '');

  // Get messages from the conversation query (this includes the full message history)
  const messages = useMemo(
    () => assistantConversationQuery.data?.data?.messages || [],
    [assistantConversationQuery.data?.data?.messages]
  );
  const error = assistantConversationQuery.error || sendMessageMutation.error;

  // Determine chat status based on message sending state
  const status: ChatStatus = sendMessageMutation.isPending
    ? 'streaming'
    : 'ready';

  const sourceCountByMessage = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of messages) {
      map[m.id] = m.content_type === 'web_search_tool_result' ? 1 : 0;
    }
    return map;
  }, [messages]);

  useEffect(() => {
    // Optional auto-focus
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    try {
      setInput('');
      await sendMessageMutation.mutateAsync({ message: text });
    } catch {
      // Error handling is done in the mutation hook
    }
  };

  // Toggle the web search state
  const handleToggleWebSearch = () => {
    setWebSearch(!webSearch);
  };

  // Set the input to the suggestion on click
  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  // Show a warning that a conversation is not yet selected
  if (!conversationID) {
    return (
      <div className='flex h-full flex-col items-center justify-center p-4'>
        <EmptyState
          icon={<TbMessageCircle className='size-full' />}
          title={dict.assistant.noConversationSelected}
          description={dict.assistant.noConversationSelectedDescription}
          size='md'
        />
      </div>
    );
  }

  // Show loading state while fetching conversation
  if (assistantConversationQuery.isLoading) {
    return <ListSkeleton items={6} className='p-2' />;
  }

  // Show error state if conversation fetch failed
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
    <div className={`relative mx-auto size-full`}>
      <div className='flex h-full flex-col'>
        <Conversation className='h-full'>
          <ConversationContent>
            {messages &&
              messages.length > 0 &&
              messages.map((message) => {
                const parts = transformMessageToParts(message);

                return (
                  <div key={message.id}>
                    {message.role === 'assistant' &&
                      sourceCountByMessage[message.id] > 0 && (
                        <Sources>
                          <SourcesTrigger
                            count={sourceCountByMessage[message.id]}
                          />
                          <SourcesContent>
                            {/* Web search results would be rendered here */}
                            <Source
                              key={`${message.id}-src-web`}
                              href='#'
                              title={dict.assistant.webSearchResult}
                            />
                          </SourcesContent>
                        </Sources>
                      )}

                    <Message from={message.role}>
                      <MessageContent>
                        {parts.map((part) => {
                          const partKey = `${message.id}-${part.type}-${part.type === 'text' ? 'text' : part.type === 'reasoning' ? 'reasoning' : part.type === 'code' ? 'code' : part.type === 'tool' ? 'tool' : part.type === 'task' ? 'task' : part.type === 'branch' ? 'branch' : part.type === 'image' ? 'image' : 'web-preview'}`;

                          switch (part.type) {
                            case 'text':
                              return (
                                <Response key={partKey}>{part.text}</Response>
                              );
                            case 'reasoning':
                              return (
                                <Reasoning
                                  key={partKey}
                                  className='w-full'
                                  isStreaming={status === 'streaming'}
                                >
                                  <ReasoningTrigger />
                                  <ReasoningContent>
                                    {part.text}
                                  </ReasoningContent>
                                </Reasoning>
                              );
                            case 'code':
                              return (
                                <div key={partKey} className='my-4'>
                                  <CodeBlock
                                    code={part.code}
                                    language={part.language}
                                  >
                                    <CodeBlockCopyButton />
                                  </CodeBlock>
                                </div>
                              );
                            case 'tool':
                              return (
                                <div key={partKey} className='my-4'>
                                  <Tool>
                                    <ToolHeader
                                      type={`tool-${part.toolName.toLowerCase()}`}
                                      state={part.state}
                                    />
                                    <ToolContent>
                                      <ToolInput input={part.input} />
                                      <ToolOutput
                                        output={JSON.stringify(
                                          part.output,
                                          null,
                                          2
                                        )}
                                        errorText=''
                                      />
                                    </ToolContent>
                                  </Tool>
                                </div>
                              );
                            case 'task':
                              return (
                                <div key={partKey} className='my-4'>
                                  <Task>
                                    <TaskTrigger title={part.title} />
                                    <TaskContent>
                                      {part.items.map((item) => (
                                        <TaskItem key={item}>{item}</TaskItem>
                                      ))}
                                    </TaskContent>
                                  </Task>
                                </div>
                              );
                            case 'branch':
                              return (
                                <div key={partKey} className='my-4'>
                                  <Branch>
                                    <BranchMessages>
                                      {part.branches.map((branch) => (
                                        <div
                                          key={branch}
                                          className='rounded-lg border p-4'
                                        >
                                          <h4 className='mb-2 font-medium'>
                                            {branch}
                                          </h4>
                                          <p
                                            className={`
                                              text-sm text-muted-foreground
                                            `}
                                          >
                                            {dict.assistant.thisIsDetailedExplanation.replace(
                                              '{approach}',
                                              branch.toLowerCase()
                                            )}
                                          </p>
                                        </div>
                                      ))}
                                    </BranchMessages>
                                    <BranchSelector from='assistant'>
                                      <BranchPrevious />
                                      <BranchPage />
                                      <BranchNext />
                                    </BranchSelector>
                                  </Branch>
                                </div>
                              );
                            case 'image':
                              return (
                                <div key={partKey} className='my-4'>
                                  <Image
                                    base64={part.base64}
                                    mediaType='image/svg+xml'
                                    alt={part.alt}
                                    className='mx-auto max-w-md'
                                    uint8Array={new Uint8Array()}
                                  />
                                </div>
                              );
                            case 'web-preview':
                              return (
                                <div key={partKey} className='my-4'>
                                  <WebPreview>
                                    <WebPreviewNavigation>
                                      <WebPreviewNavigationButton
                                        tooltip={dict.assistant.back}
                                        disabled
                                      >
                                        ←
                                      </WebPreviewNavigationButton>
                                      <WebPreviewUrl value={part.url} />
                                      <WebPreviewNavigationButton
                                        tooltip={dict.assistant.forward}
                                        disabled
                                      >
                                        →
                                      </WebPreviewNavigationButton>
                                    </WebPreviewNavigation>
                                    <WebPreviewBody src={part.url} />
                                    <WebPreviewConsole logs={part.logs} />
                                  </WebPreview>
                                </div>
                              );
                            default:
                              return null;
                          }
                        })}
                      </MessageContent>
                    </Message>
                  </div>
                );
              })}
            {(status === 'streaming' ||
              assistantConversationQuery.isLoading) && <Loader />}
            {!messages ||
              (messages.length === 0 && (
                <div
                  className={`
                    flex h-full flex-col items-center justify-center p-4
                  `}
                >
                  <EmptyState
                    icon={<TbMessageCircle className='size-full' />}
                    title={dict.assistant.noMessagesInTheConversation}
                    description={
                      dict.assistant.noMessagesInTheConversationDescription
                    }
                    size='md'
                  />
                </div>
              ))}
          </ConversationContent>

          <ConversationScrollButton />
        </Conversation>

        <PromptInput onSubmit={handleSubmit} className='mt-4'>
          <PromptInputTextarea
            ref={textareaRef}
            onChange={(e) => setInput(e.target.value)}
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
            <PromptInputSubmit disabled={!input} status={status} />
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
    </div>
  );
};

export default AssistantChat;
