'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { TbCheck, TbCopy, TbSend, TbTrash } from 'react-icons/tb';

import { getMessageContent } from '@/components/assistant/AgentChat/storedMessageHelpers';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { isSQL } from '@/utils/isSQL';

import type { AIAgentExecuteRequest } from '@/types/ai/requests';
import type { AIAgentExecuteResponse } from '@/types/ai/responses';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface SqlGenerationChatProps {
  context?: Record<string, unknown>;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  conversationId: string | undefined;
  setConversationId: React.Dispatch<React.SetStateAction<string | undefined>>;
  onReset: () => void;
}

export function SqlGenerationChat({
  context,
  messages,
  setMessages,
  conversationId,
  setConversationId,
  onReset,
}: SqlGenerationChatProps) {
  const { dict } = useLocale();
  const { getToken } = useIAM();
  const { workspaceSlug } = useWorkspaceContext();

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Reset conversation when repository context changes
  const repositorySlug = context?.['repository-slug'];
  const repositoryPath = context?.['repository-object-path'];
  const repositoryRef = context?.['repository-ref'];

  useEffect(() => {
    const repositoryKey = `${repositorySlug}-${repositoryPath}-${repositoryRef}`;
    const prevRepositoryKey = sessionStorage.getItem('sql-chat-repository-key');

    if (prevRepositoryKey && prevRepositoryKey !== repositoryKey) {
      // Repository context changed, reset conversation and clear error
      onReset();
      setError(null);
    }

    if (repositoryKey && repositoryKey !== 'undefined-undefined-undefined') {
      sessionStorage.setItem('sql-chat-repository-key', repositoryKey);
    }
  }, [repositorySlug, repositoryPath, repositoryRef, onReset]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const text = input.trim();
      if (!text || isLoading) return;

      setInput('');
      setIsLoading(true);
      setError(null);

      // Add user message
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text,
      };
      setMessages((prev) => [...prev, userMessage]);

      try {
        const request: AIAgentExecuteRequest = {
          message: text,
          conversationId,
          context,
        };

        // Query agent is non-streaming, so we call the API directly
        const token = await getToken();
        const response = await fetch(
          `/api/ai/agent/query?workspaceSlug=${workspaceSlug}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(request),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Failed to execute agent: ${response.statusText}`
          );
        }

        const conversationIdHeader =
          response.headers.get('X-Conversation-Id') ||
          response.headers.get('x-conversation-id') ||
          undefined;

        if (conversationIdHeader) {
          setConversationId(conversationIdHeader);
        }

        // Query agent returns JSON with messages array
        const data: AIAgentExecuteResponse = await response.json();

        // Extract the last AI message from the messages array
        if (data.messages && data.messages.length > 0) {
          const lastMessage = data.messages[data.messages.length - 1];
          const content = getMessageContent(lastMessage);

          if (content.trim()) {
            const assistantMessage: ChatMessage = {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              content: content.trim(),
            };
            setMessages((prev) => [...prev, assistantMessage]);
          } else {
            setError(dict.queryHelper.sqlGeneration.error);
          }
        } else {
          setError(dict.queryHelper.sqlGeneration.error);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : dict.queryHelper.sqlGeneration.error;
        setError(errorMessage);
        console.error('Error generating SQL:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [
      input,
      isLoading,
      conversationId,
      context,
      getToken,
      workspaceSlug,
      dict,
      setMessages,
      setConversationId,
    ]
  );

  const handleClear = useCallback(() => {
    onReset();
    setError(null);
  }, [onReset]);

  const handleCopy = useCallback(async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  return (
    <div className='flex h-full flex-col'>
      {/* Messages */}
      <div className='flex-1 space-y-4 overflow-y-auto p-4'>
        {messages.length === 0 && !isLoading && (
          <div className='flex h-full items-center justify-center'>
            <p className='text-sm text-muted-foreground'>
              {dict.queryHelper.sqlGeneration.noMessages}
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`
              flex
              ${message.role === 'user' ? 'justify-end' : 'justify-start'}
            `}
          >
            <div
              className={`
                max-w-[85%] rounded-lg px-3 py-2 text-sm
                ${
                  message.role === 'user'
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-muted'
                }
              `}
            >
              {message.role === 'assistant' ? (
                (() => {
                  const contentIsSQL = isSQL(message.content);
                  return contentIsSQL ? (
                    <div className='space-y-2'>
                      <div className='flex items-center justify-between gap-2'>
                        <span
                          className={`
                            text-xs font-semibold text-muted-foreground
                          `}
                        >
                          {dict.queryHelper.sqlGeneration.generatedSql}
                        </span>
                        <Button
                          variant='ghost'
                          size='sm'
                          className='h-6 gap-1 px-2 text-xs'
                          onClick={() =>
                            handleCopy(message.content, message.id)
                          }
                        >
                          {copiedMessageId === message.id ? (
                            <TbCheck size={14} />
                          ) : (
                            <TbCopy size={14} />
                          )}
                          {copiedMessageId === message.id
                            ? dict.common.copied
                            : dict.queryHelper.sqlGeneration.copySql}
                        </Button>
                      </div>
                      <pre
                        className={`
                          overflow-x-auto font-mono text-xs whitespace-pre-wrap
                        `}
                      >
                        {message.content}
                      </pre>
                    </div>
                  ) : (
                    <div className='space-y-2'>
                      <div className='flex items-center justify-between gap-2'>
                        <span
                          className={`
                            text-xs font-semibold text-muted-foreground
                          `}
                        >
                          {dict.queryHelper.sqlGeneration.response}
                        </span>
                        <Button
                          variant='ghost'
                          size='sm'
                          className='h-6 gap-1 px-2 text-xs'
                          onClick={() =>
                            handleCopy(message.content, message.id)
                          }
                        >
                          {copiedMessageId === message.id ? (
                            <TbCheck size={14} />
                          ) : (
                            <TbCopy size={14} />
                          )}
                          {copiedMessageId === message.id
                            ? dict.common.copied
                            : dict.common.copy}
                        </Button>
                      </div>
                      <p className='text-sm wrap-break-word whitespace-pre-wrap'>
                        {message.content}
                      </p>
                    </div>
                  );
                })()
              ) : (
                <p>{message.content}</p>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className='flex justify-start'>
            <div className='animate-pulse rounded-lg bg-muted px-3 py-2 text-sm'>
              <p className='text-muted-foreground'>
                {dict.queryHelper.sqlGeneration.loading}
              </p>
            </div>
          </div>
        )}

        {error && (
          <div
            className={`
              rounded-md border border-destructive bg-destructive/10 p-3 text-sm
              text-destructive
            `}
          >
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className='border-t p-4'>
        <form onSubmit={handleSubmit} className='space-y-2'>
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={dict.queryHelper.sqlGeneration.placeholder}
            disabled={isLoading}
            className={`
              min-h-[80px] resize-none
              focus:outline-none
              focus-visible:outline-none
            `}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <div className='flex items-center justify-between gap-2'>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              onClick={handleClear}
              disabled={messages.length === 0 || isLoading}
              className='gap-1'
            >
              <TbTrash size={16} />
              {dict.queryHelper.sqlGeneration.clearChat}
            </Button>
            <Button
              type='submit'
              disabled={!input.trim() || isLoading}
              className='gap-1'
            >
              <TbSend size={16} />
              {dict.queryHelper.sqlGeneration.send}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
