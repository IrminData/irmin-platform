import { memo } from 'react';

import { TbShieldCheck, TbShieldX } from 'react-icons/tb';

import { Badge } from '@/components/ui/badge';

import { useLocale } from '@/context/LocaleContext';

import type { PolicyEffect } from '@/types/core/Policy';

const PolicyEffectBadge = ({ effect }: { effect: PolicyEffect }) => {
  const { dict } = useLocale();
  return (
    <>
      {effect === 'allow' ? (
        <TbShieldCheck className='size-4 text-accent' />
      ) : (
        <TbShieldX className='size-4 text-destructive' />
      )}
      <Badge
        variant={effect === 'allow' ? 'default' : 'destructive'}
        className='px-2 text-sm'
      >
        {effect === 'allow' ? dict.policy.effectAllow : dict.policy.effectDeny}
      </Badge>
    </>
  );
};

export default memo(PolicyEffectBadge);
