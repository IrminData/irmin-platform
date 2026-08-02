import { memo } from 'react';

import { TbShieldCheck, TbShieldX } from 'react-icons/tb';

import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { useLocale } from '@/context/LocaleContext';

import type { PolicyEffect } from '@/types/core/Policy';

const PolicyEffectBadge = ({ effect }: { effect: PolicyEffect }) => {
  const { dict } = useLocale();

  const icon =
    effect === 'allow' ? (
      <TbShieldCheck className='size-4 text-accent' />
    ) : (
      <TbShieldX className='size-4 text-destructive' />
    );

  const badge = (
    <Badge
      variant={effect === 'allow' ? 'default' : 'destructive'}
      className='px-2 text-sm'
    >
      {effect === 'allow' ? dict.policy.effectAllow : dict.policy.effectDeny}
    </Badge>
  );

  if (effect === 'deny') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className='inline-flex items-center gap-2'>
              {icon}
              {badge}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {dict.policy.tooltips.denyExplanation}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <>
      {icon}
      {badge}
    </>
  );
};

export default memo(PolicyEffectBadge);
