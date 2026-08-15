'use client';

import type { ComponentProps, ReactNode } from 'react';

import type { ToolUIPart } from 'ai';

import {
  TbCheck,
  TbChevronDown,
  TbCircle,
  TbClock,
  TbTools,
  TbX,
} from 'react-icons/tb';

import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

import { useLocale } from '@/context/LocaleContext';

import { cn } from '@/utils/tw';

import { CodeBlock } from './code-block';

export type ToolProps = ComponentProps<typeof Collapsible>;

export const Tool = ({ className, ...props }: ToolProps) => (
  <Collapsible
    className={cn(
      'mb-4 w-full max-w-full overflow-hidden rounded-[2px] border',
      className
    )}
    {...props}
  />
);

export type ToolHeaderProps = {
  type: ToolUIPart['type'];
  state: ToolUIPart['state'];
  className?: string;
};

const getStatusBadge = (
  status: ToolUIPart['state'],
  labels: Record<ToolUIPart['state'], string>
) => {
  const icons = {
    'input-streaming': <TbCircle className='size-4' />,
    'input-available': <TbClock className='size-4 animate-pulse' />,
    'approval-requested': <TbClock className='size-4 text-warning' />,
    'approval-responded': <TbCheck className='size-4 text-chart-2' />,
    'output-available': <TbCheck className='size-4 text-success' />,
    'output-error': <TbX className='size-4 text-destructive' />,
    'output-denied': <TbX className='size-4 text-warning' />,
  } as const;

  return (
    <Badge className='rounded-full text-xs' variant='secondary'>
      {icons[status]}
      {labels[status]}
    </Badge>
  );
};

export const ToolHeader = ({
  className,
  type,
  state,
  ...props
}: ToolHeaderProps) => {
  const { dict } = useLocale();
  const statusLabels: Record<ToolUIPart['state'], string> = {
    'input-streaming': dict.assistant.toolStatus.pending,
    'input-available': dict.assistant.toolStatus.running,
    'approval-requested': dict.assistant.toolStatus.approvalRequested,
    'approval-responded': dict.assistant.toolStatus.approvalResponded,
    'output-available': dict.assistant.toolStatus.completed,
    'output-error': dict.assistant.toolStatus.error,
    'output-denied': dict.assistant.toolStatus.denied,
  };

  return (
    <CollapsibleTrigger
      className={cn(
        'flex w-full items-center justify-between gap-4 p-3',
        className
      )}
      {...props}
    >
      <div className='flex items-center gap-2'>
        <TbTools className='size-4 text-muted-foreground' />
        <span className='text-sm font-medium'>
          {type.startsWith('tool-') ? type.slice(5) : type}
        </span>
        {getStatusBadge(state, statusLabels)}
      </div>
      <TbChevronDown
        className={`
          size-4 text-muted-foreground transition-transform
          group-data-[state=open]:rotate-180
        `}
      />
    </CollapsibleTrigger>
  );
};

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>;

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
  <CollapsibleContent
    className={cn(
      `
        overflow-hidden text-popover-foreground outline-none
        data-[state=closed]:animate-out data-[state=closed]:fade-out-0
        data-[state=closed]:slide-out-to-top-2
        data-[state=open]:animate-in data-[state=open]:slide-in-from-top-2
      `,
      className
    )}
    {...props}
  />
);

export type ToolInputProps = Omit<ComponentProps<'div'>, 'children' | 'ref'> & {
  input: ToolUIPart['input'];
};

export const ToolInput = ({ className, input, ...props }: ToolInputProps) => {
  const { dict } = useLocale();

  return (
    <div className={cn('space-y-2 overflow-hidden p-4', className)} {...props}>
      <h4
        className={`
          text-xs font-medium tracking-wide text-muted-foreground uppercase
        `}
      >
        {dict.assistant.toolParameters}
      </h4>
      <div className='overflow-hidden rounded-[2px] bg-muted/50'>
        <CodeBlock code={JSON.stringify(input, null, 2)} language='json' />
      </div>
    </div>
  );
};

export type ToolOutputProps = Omit<
  ComponentProps<'div'>,
  'children' | 'ref'
> & {
  output: ReactNode;
  errorText: ToolUIPart['errorText'];
};

export const ToolOutput = ({
  className,
  output,
  errorText,
  ...props
}: ToolOutputProps) => {
  const { dict } = useLocale();

  if (!(output || errorText)) {
    return null;
  }

  return (
    <div className={cn('space-y-2 p-4', className)} {...props}>
      <h4
        className={`
          text-xs font-medium tracking-wide text-muted-foreground uppercase
        `}
      >
        {errorText ? dict.assistant.error : dict.assistant.toolResult}
      </h4>
      <div
        className={cn(
          `
            max-w-full overflow-x-auto rounded-[2px] text-xs
            [&_table]:w-full
          `,
          errorText
            ? 'bg-destructive/10 text-destructive'
            : 'bg-muted/50 text-foreground'
        )}
      >
        {errorText && (
          <div className='wrap-break-word break-all whitespace-pre-wrap'>
            {errorText}
          </div>
        )}
        {output && (
          <div className='wrap-break-word break-all whitespace-pre-wrap'>
            {output}
          </div>
        )}
      </div>
    </div>
  );
};
