import { useQuery } from '@tanstack/react-query';

import IrminCore from '@/lib/core';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';

import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { Role } from '@/types/core/IrminRole';

export const rolesQueryKey = ['roles'] as const;

export function useRoles() {
  const { getToken } = useIAM();
  const { locale } = useLocale();

  // Query for fetching all roles
  const rolesQuery = useQuery<IrminAPIResponse<Role[]>>({
    queryKey: rolesQueryKey,
    queryFn: async () => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      const roles = await core.roleService.fetchRoles();
      return roles;
    },
  });

  return {
    // Queries
    rolesQuery,
  };
}
