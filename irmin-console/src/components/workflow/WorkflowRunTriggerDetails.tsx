'use client';

import { useState } from 'react';

import {
  TbChevronDown,
  TbChevronRight,
  TbClock,
  TbGitBranch,
  TbRun,
} from 'react-icons/tb';

import JSONViewer from '@/components/repository/objects/ObjectViewer/JSONViewer';
import { CodeBlock } from '@/components/ui/ai-elements/code-block';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

import { useLocale } from '@/context/LocaleContext';

import type { ScheduleTrigger } from '@/types/core/Schedule';
import type { User } from '@/types/core/User';
import { JSONValue } from '@/types/internal/GenericJSON';

interface WorkflowRunTriggerDetailsProps {
  triggeredBy?: ScheduleTrigger;
  triggeredByUser?: User;
}

/**
 * Component to display detailed trigger information for a workflow run
 */
export default function WorkflowRunTriggerDetails({
  triggeredBy,
  triggeredByUser,
}: WorkflowRunTriggerDetailsProps) {
  const { dict } = useLocale();
  const [isExpanded, setIsExpanded] = useState(false);

  // Determine the trigger type and display appropriate information
  const getTriggerDisplayInfo = () => {
    if (triggeredByUser) {
      return {
        type: 'manual',
        icon: <TbRun className='size-4' />,
        title: dict.workflow.schedule.manualTrigger,
        description: `${dict.workflow.triggeredBy} ${triggeredByUser.email}${triggeredByUser.company ? ` (${triggeredByUser.company})` : ''}`,
      };
    }

    if (triggeredBy) {
      switch (triggeredBy.type) {
        case 'time': {
          const timeTrigger = triggeredBy;
          return {
            type: 'schedule',
            icon: <TbClock className='size-4' />,
            title: dict.workflow.schedule.scheduledTrigger,
            description: timeTrigger.cron
              ? dict.workflow.schedule.cronExpression
              : dict.workflow.schedule.recurrenceRule,
            details: (
              <div className='mt-2 space-y-2'>
                {timeTrigger.cron && (
                  <div>
                    <p className='mb-1 text-sm font-medium'>
                      {dict.workflow.schedule.cronExpression}:
                    </p>
                    <CodeBlock code={timeTrigger.cron} language='cron' />
                  </div>
                )}
                {timeTrigger.rrule && (
                  <div>
                    <p className='mb-1 text-sm font-medium'>
                      {dict.workflow.schedule.recurrenceRule}:
                    </p>
                    <CodeBlock code={timeTrigger.rrule} language='text' />
                  </div>
                )}
              </div>
            ),
          };
        }
        case 'repository-event': {
          const repoTrigger = triggeredBy;
          return {
            type: 'repository',
            icon: <TbGitBranch className='size-4' />,
            title: dict.workflow.schedule.repositoryEventTrigger,
            description: `${repoTrigger.event}${repoTrigger.repository ? ` (${repoTrigger.repository})` : ''}`,
            details: (
              <div className='mt-2 space-y-2'>
                <div>
                  <p className='mb-1 text-sm font-medium'>
                    {dict.workflow.schedule.event}:
                  </p>
                  <p className='text-sm text-muted-foreground'>
                    {repoTrigger.event}
                  </p>
                </div>
                {repoTrigger.repository && (
                  <div>
                    <p className='mb-1 text-sm font-medium'>
                      {dict.repository.repository}:
                    </p>
                    <p className='text-sm text-muted-foreground'>
                      {repoTrigger.repository}
                    </p>
                  </div>
                )}
                {repoTrigger.ref && (
                  <div>
                    <p className='mb-1 text-sm font-medium'>
                      {dict.repository.branches.ref}:
                    </p>
                    <p className='text-sm text-muted-foreground'>
                      {repoTrigger.ref}
                    </p>
                  </div>
                )}
              </div>
            ),
          };
        }
        case 'workflow-run-event': {
          const workflowTrigger = triggeredBy;
          return {
            type: 'workflow',
            icon: <TbRun className='size-4' />,
            title: dict.workflow.schedule.workflowRunEventTrigger,
            description: `${workflowTrigger.event}${workflowTrigger.workflow ? ` (${workflowTrigger.workflow})` : ''}`,
            details: (
              <div className='mt-2 space-y-2'>
                <div>
                  <p className='mb-1 text-sm font-medium'>
                    {dict.workflow.schedule.event}:
                  </p>
                  <p className='text-sm text-muted-foreground'>
                    {workflowTrigger.event}
                  </p>
                </div>
                {workflowTrigger.workflow && (
                  <div>
                    <p className='mb-1 text-sm font-medium'>
                      {dict.workflow.schedule.sourceWorkflow}:
                    </p>
                    <p className='text-sm text-muted-foreground'>
                      {workflowTrigger.workflow}
                    </p>
                  </div>
                )}
              </div>
            ),
          };
        }
        default:
          return {
            type: 'unknown',
            icon: <TbRun className='size-4' />,
            title: dict.workflow.schedule.unknownTrigger,
            description: 'Trigger type not recognized',
            details: null,
          };
      }
    }

    return {
      type: 'unknown',
      icon: <TbRun className='size-4' />,
      title: dict.workflow.schedule.noTriggerInformation,
      description: 'No trigger information available',
      details: null,
    };
  };

  const triggerInfo = getTriggerDisplayInfo();

  return (
    <div className='space-y-2'>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger
          className={`
            flex w-full items-center justify-between rounded-md border
            border-border bg-card p-3 text-left
          `}
        >
          <div className='flex items-center gap-2'>
            {triggerInfo.icon}
            <div>
              <p className='text-sm font-medium'>{triggerInfo.title}</p>
              <p className='text-xs text-muted-foreground'>
                {triggerInfo.description}
              </p>
            </div>
          </div>
          {triggerInfo.details || triggeredBy ? (
            <>
              {isExpanded ? (
                <TbChevronDown className='size-4 text-muted-foreground' />
              ) : (
                <TbChevronRight className='size-4 text-muted-foreground' />
              )}
            </>
          ) : (
            <></>
          )}
        </CollapsibleTrigger>

        {triggerInfo.details || triggeredBy ? (
          <CollapsibleContent className='space-y-3'>
            <div className='rounded-md border border-border bg-muted/30 p-3'>
              {triggerInfo.details}

              {triggeredBy && (
                <div className='mt-4'>
                  <p className='mb-2 text-sm font-medium'>
                    {dict.workflow.schedule.rawTriggerData}:
                  </p>
                  <div
                    className={`
                      rounded-md border border-border bg-background p-2
                    `}
                  >
                    <JSONViewer
                      data={triggeredBy as unknown as JSONValue}
                      name='trigger-data'
                    />
                  </div>
                </div>
              )}
            </div>
          </CollapsibleContent>
        ) : (
          <></>
        )}
      </Collapsible>
    </div>
  );
}
