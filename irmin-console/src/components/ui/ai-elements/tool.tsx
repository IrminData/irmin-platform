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

import { cn } from '@/utils/tw';

import { CodeBlock } from './code-block';

export type ToolProps = ComponentProps<typeof Collapsible>;

export const Tool = ({ className, ...props }: ToolProps) => (
  <Collapsible
    className={cn(
      'mb-4 w-full max-w-full overflow-hidden rounded-md border',
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

const getStatusBadge = (status: ToolUIPart['state']) => {
  const labels = {
    'input-streaming': 'Pending',
    'input-available': 'Running',
    'output-available': 'Completed',
    'output-error': 'Error',
  } as const;

  const icons = {
    'input-streaming': <TbCircle className='size-4' />,
    'input-available': <TbClock className='size-4 animate-pulse' />,
    'output-available': <TbCheck className='size-4 text-green-600' />,
    'output-error': <TbX className='size-4 text-red-600' />,
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
}: ToolHeaderProps) => (
  <CollapsibleTrigger
    className={cn(
      'flex w-full items-center justify-between gap-4 p-3',
      className
    )}
    {...props}
  >
    <div className='flex items-center gap-2'>
      <TbTools className='size-4 text-muted-foreground' />
      <span className='text-sm font-medium'>{type}</span>
      {getStatusBadge(state)}
    </div>
    <TbChevronDown
      className={`
        size-4 text-muted-foreground transition-transform
        group-data-[state=open]:rotate-180
      `}
    />
  </CollapsibleTrigger>
);

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

export type ToolInputProps = ComponentProps<'div'> & {
  input: ToolUIPart['input'];
};

export const ToolInput = ({ className, input, ...props }: ToolInputProps) => (
  <div className={cn('space-y-2 overflow-hidden p-4', className)} {...props}>
    <h4
      className={`
        text-xs font-medium tracking-wide text-muted-foreground uppercase
      `}
    >
      Parameters
    </h4>
    <div className='overflow-hidden rounded-md bg-muted/50'>
      <CodeBlock code={JSON.stringify(input, null, 2)} language='json' />
    </div>
  </div>
);

export type ToolOutputProps = ComponentProps<'div'> & {
  output: ReactNode;
  errorText: ToolUIPart['errorText'];
};

export const ToolOutput = ({
  className,
  output,
  errorText,
  ...props
}: ToolOutputProps) => {
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
        {errorText ? 'Error' : 'Result'}
      </h4>
      <div
        className={cn(
          `
            max-w-full overflow-x-auto rounded-md text-xs
            [&_table]:w-full
          `,
          errorText
            ? 'bg-destructive/10 text-destructive'
            : 'bg-muted/50 text-foreground'
        )}
      >
        {errorText && (
          <div className='break-words break-all whitespace-pre-wrap'>
            {errorText}
          </div>
        )}
        {output && (
          <div className='break-words break-all whitespace-pre-wrap'>
            {output}
          </div>
        )}
      </div>
    </div>
  );
};
