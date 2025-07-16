import { useQuery } from '@tanstack/react-query';

import IrminCore from '@/lib/core';
import { rolesQueryKey } from '@/lib/queryKeys';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { Role } from '@/types/core/Role';

export function useRoles() {
  const { getToken } = useIAM();
  const { locale } = useLocale();

  const rolesQuery = useQuery<IrminAPIResponse<Role[]>, Error>({
    queryKey: rolesQueryKey,
    queryFn: async () => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.roleService.fetchRoles();
    },
  });

  return {
    rolesQuery,
  };
}
