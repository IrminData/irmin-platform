'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { TbSend, TbTrash } from 'react-icons/tb';

import { getMessageContent } from '@/components/assistant/AgentChat/storedMessageHelpers';
import { Response } from '@/components/ui/ai-elements/response';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { AIAgentExecuteRequest } from '@/types/ai/requests';
import type { AIAgentExecuteResponse } from '@/types/ai/responses';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ScriptGenerationChatProps {
  context?: Record<string, unknown>;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  conversationId: string | undefined;
  setConversationId: React.Dispatch<React.SetStateAction<string | undefined>>;
  onReset: () => void;
}

/**
 * Chat panel that talks to the irmin-ai `scripting` agent. Mirrors
 * SqlGenerationChat in structure: synchronous fetch, last-AI-message
 * extraction, conversation persistence across panel open/close, automatic
 * reset when the underlying script identity changes.
 */
export function ScriptGenerationChat({
  context,
  messages,
  setMessages,
  conversationId,
  setConversationId,
  onReset,
}: ScriptGenerationChatProps) {
  const { dict } = useLocale();
  const { getToken } = useIAM();
  const { workspaceSlug } = useWorkspaceContext();

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  // Reset the conversation when the script identity changes. Script name +
  // language uniquely identify what we're authoring.
  const scriptName = context?.['script-name'];
  const language = context?.['language'];
  const scriptKey = `${scriptName}-${language}`;

  const prevScriptKeyRef = useRef<string | null>(null);
  const hasHydratedScriptKeyRef = useRef(false);

  useEffect(() => {
    if (!hasHydratedScriptKeyRef.current) {
      prevScriptKeyRef.current = sessionStorage.getItem(
        'script-chat-context-key'
      );
      hasHydratedScriptKeyRef.current = true;
    }

    const prev = prevScriptKeyRef.current;
    if (prev !== null && prev !== scriptKey) {
      onReset();
      setError(null);
    }
    prevScriptKeyRef.current = scriptKey;

    if (scriptKey && scriptKey !== 'undefined-undefined') {
      sessionStorage.setItem('script-chat-context-key', scriptKey);
    }
  }, [scriptKey, onReset]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const text = input.trim();
      if (!text || isLoading) return;

      setInput('');
      setIsLoading(true);
      setError(null);

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

        const token = await getToken();
        const response = await fetch(
          `/api/ai/agent/scripting?workspaceSlug=${workspaceSlug}`,
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

        const data: AIAgentExecuteResponse = await response.json();

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
            setError(dict.scriptHelper.scriptGeneration.error);
          }
        } else {
          setError(dict.scriptHelper.scriptGeneration.error);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : dict.scriptHelper.scriptGeneration.error;
        setError(errorMessage);
        console.error('Error generating script:', err);
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

  return (
    <div className='flex h-full flex-col'>
      <div className='flex-1 space-y-4 overflow-y-auto p-4'>
        {messages.length === 0 && !isLoading && (
          <div className='flex h-full items-center justify-center'>
            <p className='text-sm text-muted-foreground'>
              {dict.scriptHelper.scriptGeneration.noMessages}
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
                <Response className='text-sm'>{message.content}</Response>
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
                {dict.scriptHelper.scriptGeneration.loading}
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

      <div className='border-t p-4'>
        <form onSubmit={handleSubmit} className='space-y-2'>
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={dict.scriptHelper.scriptGeneration.placeholder}
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
              <TbTrash size={16} aria-hidden='true' />
              {dict.scriptHelper.scriptGeneration.clearChat}
            </Button>
            <Button
              type='submit'
              disabled={!input.trim() || isLoading}
              className='gap-1'
            >
              <TbSend size={16} aria-hidden='true' />
              {dict.scriptHelper.scriptGeneration.send}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
