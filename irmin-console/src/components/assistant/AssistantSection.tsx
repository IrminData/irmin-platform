'use client';

import { useState } from 'react';

import { TbMenu2, TbX } from 'react-icons/tb';

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

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

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
  const { profile } = useIAM();
  const [selectedConversation, setSelectedConversation] =
    useState<AIConversation | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Handle when a new conversation is created
  const handleConversationCreated = (conversationId: string) => {
    // Create a temporary conversation object to select
    const newConversation: AIConversation = {
      id: conversationId,
      title: 'New Conversation',
      workspaceSlug,
      userId: profile?.id ?? '',
      metadata: {},
      agentId: 'chat', // Chat agent conversation
      messageCount: 1,
      totalTokens: 0,
      totalCost: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSelectedConversation(newConversation);
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
                    onSelectConversation={setSelectedConversation}
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
              onSelectConversation={setSelectedConversation}
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
                    {selectedConversation
                      ? selectedConversation.title || 'Untitled Conversation'
                      : dict.assistant.title}
                  </CardTitle>
                </div>
                {/* Mobile conversation details toggle */}
                {selectedConversation && (
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => setSelectedConversation(null)}
                    className='xl:hidden'
                  >
                    <TbX size={16} />
                  </Button>
                )}
              </CardHeader>
              <CardContent className='flex-1 overflow-hidden p-0'>
                <AgentChat
                  conversationID={selectedConversation?.id || null}
                  agentId='chat' // Use the general assistant agent
                  onConversationCreated={handleConversationCreated}
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
            onCloseConversation={() => setSelectedConversation(null)}
          />
        )}
      </div>
    </SafeComponent>
  );
}
