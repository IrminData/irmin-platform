import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import IrminCore from '@/lib/core';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { APIToken } from '@/types/core/APIToken';
import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

export const credentialsQueryKey = ['credentials'] as const;

export function useCredentials() {
  const { getToken } = useIAM();
  const { irminAlert } = usePopup();
  const { locale } = useLocale();
  const queryClient = useQueryClient();

  // Query for fetching all API tokens for the current user
  const credentialsQuery = useQuery<IrminAPIResponse<APIToken[]>>({
    queryKey: credentialsQueryKey,
    queryFn: async () => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.credentialService.getSystemTokens();
    },
  });

  const createCredentialMutation = useMutation({
    mutationFn: async (input: { name: string; expiry: number }) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.credentialService.createSystemToken(input);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: credentialsQueryKey });
      irminAlert('success', res.message ?? 'Credential created successfully');
    },
    onError: (error) => {
      console.error(error);
      irminAlert('error', error.message ?? 'Failed to create credential');
    },
  });

  const revokeCredentialMutation = useMutation({
    mutationFn: async (tokenID: string) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.credentialService.revokeSystemToken({ token: tokenID });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: credentialsQueryKey });
      irminAlert('success', res.message ?? 'Credential revoked successfully');
    },
    onError: (error) => {
      console.error(error);
      irminAlert('error', error.message ?? 'Failed to revoke credential');
    },
  });

  return {
    // Queries
    credentialsQuery,

    // Mutations
    createCredentialMutation,
    revokeCredentialMutation,
  };
}
