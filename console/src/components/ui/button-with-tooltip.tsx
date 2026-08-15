'use client';

import { forwardRef } from 'react';

import { Button } from '@/components/ui/button';
import type { ButtonProps } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ButtonWithTooltipProps extends ButtonProps {
  tooltip?: string;
}

const ButtonWithTooltip = forwardRef<HTMLButtonElement, ButtonWithTooltipProps>(
  ({ children, tooltip, icon, ...props }, ref) => {
    const accessibleName =
      props['aria-label'] ??
      (props['aria-labelledby'] || children != null ? undefined : tooltip);
    const decorativeIcon = icon ? (
      <span aria-hidden='true' className='inline-flex shrink-0'>
        {icon}
      </span>
    ) : undefined;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              ref={ref}
              icon={decorativeIcon}
              {...props}
              aria-label={accessibleName}
            >
              {children}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
);

ButtonWithTooltip.displayName = 'ButtonWithTooltip';

export { ButtonWithTooltip };
