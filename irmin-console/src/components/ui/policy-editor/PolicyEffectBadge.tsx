import React from 'react';

import { TbShieldCheck, TbShieldX } from 'react-icons/tb';

import { Badge } from '@/components/ui/badge';

import { useLocale } from '@/context/LocaleContext';

import { PolicyEffect } from '@/types/core/Policy';

const PolicyEffectBadge = ({ effect }: { effect: PolicyEffect }) => {
  const { dict } = useLocale();
  return (
    <>
      {effect === PolicyEffect.Allow ? (
        <TbShieldCheck className='text-accent h-4 w-4' />
      ) : (
        <TbShieldX className='text-destructive h-4 w-4' />
      )}
      <Badge
        variant={effect === PolicyEffect.Allow ? 'default' : 'destructive'}
        className='px-2 text-sm'
      >
        {effect === PolicyEffect.Allow
          ? dict.policy.effectAllow
          : dict.policy.effectDeny}
      </Badge>
    </>
  );
};

export default React.memo(PolicyEffectBadge);
