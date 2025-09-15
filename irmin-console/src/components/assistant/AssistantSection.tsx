'use client';

import { useEffect, useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { TbMenu2, TbX } from 'react-icons/tb';

import { aiConversationQueryKey } from '@/lib/queryKeys';

import AgentChat from '@/components/assistant/AgentChat';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SafeComponent from '@/components/ui/error/SafeComponent';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { useAIConversation } from '@/hooks/api/useAIConversation';
import { useAIConversations } from '@/hooks/api/useAIConversations';

import type { AIConversation } from '@/types/ai/base';

import ConversationDetails from './ConversationDetails';
import ConversationsList from './ConversationsList';

/**
 * Assistant section
 *
 * Provides a section to chat with the AI assistant and manage conversations
 */
export default function AssistantSection() {
  const { dict } = useLocale();
  const { workspaceSlug } = useWorkspaceContext();
  const queryClient = useQueryClient();
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const refetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch conversations list to enable refetching
  const { aiConversationsQuery: _aiConversationsQuery } = useAIConversations({
    sortBy: 'createdAt',
    sortOrder: 'desc',
    agentId: 'assistant',
  });

  // Fetch the selected conversation details
  const { aiConversationQuery } = useAIConversation(
    selectedConversationId || '',
    {
      enabled: !!selectedConversationId,
    }
  );

  // Get the current conversation data
  const selectedConversation = aiConversationQuery.data;

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (refetchTimeoutRef.current) {
        clearTimeout(refetchTimeoutRef.current);
      }
    };
  }, []);

  // Handle when a new conversation is created
  const handleConversationCreated = (conversationId: string) => {
    setSelectedConversationId(conversationId);

    // Invalidate conversations list to show the new conversation
    queryClient.invalidateQueries({
      predicate: (query) => {
        const [key, ...rest] = query.queryKey;
        return key === 'ai-conversations' && rest[0] === workspaceSlug;
      },
    });
  };

  // Handle when conversation data might have been updated (e.g., title generation)
  const handleConversationUpdated = (conversationId: string) => {
    // Clear any existing timeout to prevent race conditions
    if (refetchTimeoutRef.current) {
      clearTimeout(refetchTimeoutRef.current);
    }

    // Invalidate both the specific conversation and the conversations list
    queryClient.invalidateQueries({
      queryKey: aiConversationQueryKey(workspaceSlug, conversationId),
    });
    queryClient.invalidateQueries({
      predicate: (query) => {
        const [key, ...rest] = query.queryKey;
        return key === 'ai-conversations' && rest[0] === workspaceSlug;
      },
    });

    // Schedule a refetch with proper cleanup
    refetchTimeoutRef.current = setTimeout(() => {
      queryClient.refetchQueries({
        queryKey: aiConversationQueryKey(workspaceSlug, conversationId),
      });
      queryClient.refetchQueries({
        predicate: (query) => {
          const [key, ...rest] = query.queryKey;
          return key === 'ai-conversations' && rest[0] === workspaceSlug;
        },
      });
      refetchTimeoutRef.current = null;
    }, 1000);
  };

  // Handle conversation selection
  const handleSelectConversation = (conversation: AIConversation | null) => {
    setSelectedConversationId(conversation?.id || null);
  };

  return (
    <SafeComponent
      level='section'
      title={dict.assistant.assistantInterfaceError}
      description={dict.assistant.failedToLoadAssistantInterface}
    >
      <div className='flex h-full flex-col bg-background'>
        <div
          className={`
            flex h-full flex-col
            xl:flex-row
          `}
        >
          {/* Mobile Sidebar - Sheet */}
          <div className='xl:hidden'>
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetContent side='left' className='w-80 p-0'>
                <SheetHeader className='p-4 pb-2'>
                  <SheetTitle>{dict.assistant.conversations}</SheetTitle>
                </SheetHeader>
                <div className='flex-1 overflow-y-auto'>
                  <ConversationsList
                    selectedConversation={selectedConversation}
                    onSelectConversation={handleSelectConversation}
                    onSidebarClose={() => setSidebarOpen(false)}
                    onDetailsOpen={() => setDetailsOpen(true)}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Desktop Sidebar */}
          <div
            className={`
              hidden w-80 flex-col overflow-y-scroll border-r border-border
              xl:flex
            `}
          >
            <ConversationsList
              selectedConversation={selectedConversation}
              onSelectConversation={handleSelectConversation}
              onSidebarClose={() => {}}
              onDetailsOpen={() => setDetailsOpen(true)}
            />
          </div>

          {/* Main Chat Area */}
          <div
            className={`
              flex h-full flex-1 flex-col p-2
              xl:p-4
            `}
          >
            <Card className='flex h-full flex-col shadow-none'>
              <CardHeader
                className={`
                  flex flex-row items-center justify-between border-b
                  border-border p-2
                  xl:p-6
                `}
              >
                <div className='flex items-center gap-2'>
                  {/* Mobile conversation list toggle button */}
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => setSidebarOpen(true)}
                    className='xl:hidden'
                  >
                    <TbMenu2 size={16} />
                  </Button>
                  <CardTitle>
                    {selectedConversationId && aiConversationQuery.isLoading
                      ? 'Loading conversation...'
                      : selectedConversation
                        ? selectedConversation.title ||
                          dict.assistant.newConversation
                        : dict.assistant.title}
                  </CardTitle>
                </div>
                {/* Mobile conversation details toggle */}
                {selectedConversation && (
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => setSelectedConversationId(null)}
                    className='xl:hidden'
                  >
                    <TbX size={16} />
                  </Button>
                )}
              </CardHeader>
              <CardContent className='flex-1 overflow-hidden p-0'>
                <AgentChat
                  conversationID={selectedConversationId}
                  agentId='assistant' // Use the general assistant agent
                  onConversationCreated={handleConversationCreated}
                  onConversationUpdated={handleConversationUpdated}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Conversation Details Sheet */}
        {selectedConversation && (
          <ConversationDetails
            conversation={selectedConversation}
            open={detailsOpen}
            onOpenChange={setDetailsOpen}
            onCloseConversation={() => setSelectedConversationId(null)}
          />
        )}
      </div>
    </SafeComponent>
  );
}
