'use client';

import { useState } from 'react';

import { TbMessageCircle, TbX } from 'react-icons/tb';

import AssistantChat from '@/components/assistant/AssistantChat';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import SafeComponent from '@/components/ui/error/SafeComponent';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

import { useLocale } from '@/context/LocaleContext';

import type { AssistantConversation } from '@/types/core/Assistant';

import ConversationDetails from './ConversationDetails';
import ConversationsList from './ConversationsList';

/**
 * Assistant section
 *
 * Provides a section to chat with the AI assistant and manage conversations
 */
export default function AssistantSection() {
  const { dict } = useLocale();
  const [selectedConversation, setSelectedConversation] =
    useState<AssistantConversation | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

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
              <CardHeader className='flex flex-row items-center justify-between'>
                <CardTitle>
                  {selectedConversation
                    ? selectedConversation.title
                    : dict.assistant.title}
                </CardTitle>
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
              <CardContent className='flex-1 overflow-hidden'>
                {selectedConversation ? (
                  <AssistantChat conversationID={selectedConversation.id} />
                ) : (
                  <div className='flex h-full flex-col overflow-y-auto'>
                    <EmptyState
                      icon={<TbMessageCircle className='size-full' />}
                      title={dict.assistant.noConversationSelected}
                      description={
                        dict.assistant.noConversationSelectedDescription
                      }
                      size='md'
                      className='mt-6'
                    />
                    {/* Mobile conversation list when no conversation selected */}
                    <div
                      className={`
                        mt-6 max-h-96
                        xl:hidden
                      `}
                    >
                      <ConversationsList
                        selectedConversation={selectedConversation}
                        onSelectConversation={setSelectedConversation}
                        onSidebarClose={() => {}}
                        onDetailsOpen={() => setDetailsOpen(true)}
                      />
                    </div>
                  </div>
                )}
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
