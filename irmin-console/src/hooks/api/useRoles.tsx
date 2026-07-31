import { useQuery } from '@tanstack/react-query';

import { rolesQueryKey } from '@/lib/queryKeys';

import { useIrminCore } from '@/context/IrminCoreContext';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { Role } from '@/types/core/Role';

export function useRoles() {
  const { getCore } = useIrminCore();

  const rolesQuery = useQuery<IrminAPIResponse<Role[]>, Error>({
    queryKey: rolesQueryKey,
    queryFn: async () => {
      const core = await getCore();
      return await core.roleService.fetchRoles();
    },
  });

  return {
    rolesQuery,
  };
}
