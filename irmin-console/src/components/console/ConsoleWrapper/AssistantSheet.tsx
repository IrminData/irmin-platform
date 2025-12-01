'use client';

import { useState } from 'react';

import { usePathname } from 'next/navigation';

import { TbCircle } from 'react-icons/tb';

import AssistantSection from '@/components/assistant/AssistantSection';
import { ButtonWithTooltip } from '@/components/ui/button-with-tooltip';
import { Sheet, SheetContent } from '@/components/ui/sheet';

import { useLocale } from '@/context/LocaleContext';
import { WorkspaceProvider } from '@/context/WorkspaceContext';

import { useBaseUrl } from '@/hooks/utils';

import type { Workspace } from '@/types/core/Workspace';

interface AssistantSheetProps {
  currentWorkspace?: Workspace;
}

export default function AssistantSheet({
  currentWorkspace,
}: AssistantSheetProps) {
  const { dict } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const pathname = usePathname();

  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'workspace',
    includeSegment: true,
    segmentsAfter: 1,
  });
  const assistantUrl = `${workspaceUrl}/assistant`;

  // Check if we're on the assistant page
  const isOnAssistantPage = pathname.startsWith(assistantUrl);

  // Check if we're on the dashboard page
  const isOnDashboardPage =
    pathname.startsWith(`${workspaceUrl}/dashboard`) ||
    pathname === workspaceUrl;

  const shouldShow =
    currentWorkspace && !isOnAssistantPage && !isOnDashboardPage;

  if (!shouldShow) return null;

  return (
    <>
      {/* Floating Assistant Button */}
      <div className='fixed right-6 bottom-6 z-50'>
        <ButtonWithTooltip
          onClick={() => setIsOpen(true)}
          size='icon'
          variant='gradient'
          tooltip={dict.assistant.title}
          className={`
            size-12 rounded-full shadow-lg transition-all duration-200
            hover:shadow-xl
          `}
          aria-label={dict.assistant.title}
        >
          <TbCircle className='size-6' />
        </ButtonWithTooltip>
      </div>

      {/* AI Assistant Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          side='right'
          className='flex w-full max-w-4xl flex-col p-0'
          hideCloseButton
        >
          <div className='relative flex-1 overflow-hidden'>
            <WorkspaceProvider workspaceSlug={currentWorkspace.slug}>
              <AssistantSection
                compact={true}
                showContextBanner={true}
                onClose={() => setIsOpen(false)}
                conversationId={conversationId}
                onConversationChange={setConversationId}
              />
            </WorkspaceProvider>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
