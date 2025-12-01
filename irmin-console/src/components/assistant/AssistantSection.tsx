'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { useParams, usePathname, useSearchParams } from 'next/navigation';

import { useQueryClient } from '@tanstack/react-query';

import { TbExternalLink, TbMenu2, TbPlus, TbX } from 'react-icons/tb';

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
import { useBaseUrl } from '@/hooks/utils';

import type { AIConversation } from '@/types/ai/base';

import { ButtonWithTooltip } from '../ui/button-with-tooltip';
import ConversationDetails from './ConversationDetails';
import ConversationsList from './ConversationsList';

interface AssistantSectionProps {
  /**
   * Whether to render in compact mode (no sidebar, no conversation details)
   * Used when displaying in a sheet or modal
   */
  compact?: boolean;
  /**
   * Whether to show the context banner
   */
  showContextBanner?: boolean;
  /**
   * Callback to close the sheet/modal when in compact mode
   */
  onClose?: () => void;
  /**
   * Whether to render without a border
   */
  noBorder?: boolean;
  /**
   * The currently selected conversation ID (controlled mode)
   */
  conversationId?: string | null;
  /**
   * Callback when the selected conversation changes
   */
  onConversationChange?: (id: string | null) => void;
}

/**
 * Assistant section
 *
 * Provides a section to chat with the AI assistant and manage conversations
 */
export default function AssistantSection({
  compact = false,
  showContextBanner = true,
  noBorder = false,
  onClose,
  conversationId: controlledConversationId,
  onConversationChange,
}: AssistantSectionProps) {
  const { dict } = useLocale();
  const { workspaceSlug } = useWorkspaceContext();
  const queryClient = useQueryClient();
  const [internalSelectedConversationId, setInternalSelectedConversationId] =
    useState<string | null>(null);

  const selectedConversationId =
    controlledConversationId !== undefined
      ? controlledConversationId
      : internalSelectedConversationId;

  const setSelectedConversationId = (id: string | null) => {
    setInternalSelectedConversationId(id);
    onConversationChange?.(id);
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const refetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Extract context from URL params
  const params = useParams();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const context = useMemo(() => {
    const ctx: Record<string, unknown> = {};

    // Map URL params to context keys
    if (params) {
      if (params.repository) {
        ctx['repository-slug'] = params.repository;
      }
      if (params.connection) {
        ctx['connection-id'] = params.connection;
      }
      if (params.workflow) {
        ctx['workflow-id'] = params.workflow;
      }
      if (params.query) {
        ctx['stored-query-id'] = params.query;
      }
      // Handle catch-all routes like [...path] for object paths
      // Only set if we are inside a repository context
      if (params.repository) {
        if (Array.isArray(params.path)) {
          ctx['repository-object-path'] = params.path.join('/');
        } else if (typeof params.path === 'string') {
          ctx['repository-object-path'] = params.path;
        }
      }
    }

    // Map search params to context keys
    if (searchParams) {
      const ref = searchParams.get('ref');
      // Only set ref if we are inside a repository context
      if (ref && params?.repository) {
        ctx['repository-ref'] = ref;
      }

      // Handle repository object selection via query param
      const objectPath = searchParams.get('object');
      if (objectPath && params?.repository) {
        ctx['repository-object-path'] = objectPath;
      }

      // Track open editor tabs for scripting agent context (only when on editor page)
      // Check if the current route is related to the editor
      if (pathname && pathname.includes('/editor')) {
        const openTabs = searchParams.getAll('path');
        if (openTabs && openTabs.length > 0) {
          ctx['editor-script-paths'] = openTabs.join(',');
        }
      }
    }

    return ctx;
  }, [params, searchParams, pathname]);

  // Assistant page URL to open in full page
  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'workspace',
    includeSegment: true,
    segmentsAfter: 1,
  });
  const assistantUrl = `${workspaceUrl}/assistant`;

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

  // Handle starting a new conversation in compact mode
  const handleNewConversation = () => {
    setSelectedConversationId(null);
  };

  if (compact) {
    // Compact mode: only show chat area with new conversation button
    return (
      <SafeComponent
        level='section'
        title={dict.assistant.assistantInterfaceError}
        description={dict.assistant.failedToLoadAssistantInterface}
      >
        <div className='flex h-full flex-col bg-background'>
          <Card
            className={`
              flex h-full flex-col rounded-none shadow-none
              ${noBorder ? 'border-0' : ''}
            `}
          >
            <CardHeader
              className={`
                flex flex-row items-center justify-between border-b
                border-border p-4
              `}
            >
              <div className='flex items-center gap-2'>
                <CardTitle>
                  {selectedConversationId && aiConversationQuery.isLoading
                    ? dict.common.loading
                    : selectedConversation
                      ? selectedConversation.title ||
                        dict.assistant.newConversation
                      : dict.assistant.title}
                </CardTitle>
              </div>
              <div className='flex items-center gap-2'>
                <ButtonWithTooltip
                  variant='ghost'
                  icon={<TbPlus size={16} />}
                  size='icon'
                  onClick={handleNewConversation}
                  disabled={!selectedConversationId}
                  tooltip={dict.assistant.newConversation}
                />
                <ButtonWithTooltip
                  href={assistantUrl}
                  variant='ghost'
                  size='icon'
                  icon={<TbExternalLink size={16} />}
                  tooltip={dict.assistant.openInFullPage}
                />
                {onClose && (
                  <ButtonWithTooltip
                    variant='ghost'
                    icon={<TbX size={16} />}
                    size='icon'
                    onClick={onClose}
                    tooltip={dict.common.close}
                  />
                )}
              </div>
            </CardHeader>
            <CardContent className='flex-1 overflow-hidden p-0'>
              <AgentChat
                conversationID={selectedConversationId}
                agentId='assistant'
                onConversationCreated={handleConversationCreated}
                onConversationUpdated={handleConversationUpdated}
                context={context}
                showContextBanner={showContextBanner}
              />
            </CardContent>
          </Card>
        </div>
      </SafeComponent>
    );
  }

  // Full mode: show sidebar and all features
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
                <div className='flex h-full flex-1 flex-col overflow-hidden'>
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
              hidden w-80 flex-col overflow-hidden border-r border-border
              xl:flex xl:shrink-0
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
              xl:mx-auto xl:max-w-5xl xl:p-4
            `}
          >
            <Card className='flex size-full flex-col shadow-none'>
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
                      ? dict.common.loading
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
                  context={context}
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
