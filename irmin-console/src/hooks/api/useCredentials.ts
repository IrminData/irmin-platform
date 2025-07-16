import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import IrminCore from '@/lib/core';
import type { CreateCredentialRequest } from '@/lib/core/resources/CredentialService';
import { credentialsQueryKey } from '@/lib/queryKeys';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import type { APIToken } from '@/types/core/APIToken';
import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

import {
  createMutationHandlers,
  deleteMutationHandlers,
} from './mutations/utils';

export function useCredentials() {
  const { getToken } = useIAM();
  const { locale } = useLocale();
  const { irminAlert } = usePopup();
  const queryClient = useQueryClient();

  const credentialsQuery = useQuery<IrminAPIResponse<APIToken[]>, Error>({
    queryKey: credentialsQueryKey,
    queryFn: async () => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.credentialService.getSystemTokens();
    },
  });

  const deleteCredentialMutation = useMutation<IrminAPIResponse, Error, string>(
    {
      mutationFn: async (tokenID) => {
        const token = await getToken();
        const core = new IrminCore(locale, token);
        return await core.credentialService.revokeSystemToken({
          tokenID,
        });
      },
      ...deleteMutationHandlers<APIToken>(queryClient, {
        cacheConfig: {
          primaryQueryKey: credentialsQueryKey,
          getItemId: (token) => token.id,
        },
        onSuccess: (res) => {
          irminAlert(
            'success',
            res.message ?? 'Credential deleted successfully'
          );
        },
        onError: (error) => {
          irminAlert('error', error.message ?? 'Error deleting credential');
        },
      }),
    }
  );

  const createCredentialMutation = useMutation<
    IrminAPIResponse<APIToken>,
    Error,
    CreateCredentialRequest
  >({
    mutationFn: async (data) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.credentialService.createSystemToken(data);
    },
    ...createMutationHandlers<APIToken, CreateCredentialRequest>(
      queryClient,
      'credentials',
      {
        cacheConfig: {
          primaryQueryKey: credentialsQueryKey,
          getItemId: (token) => token.id,
          createOptimisticItem: (
            input: CreateCredentialRequest,
            tempId: string
          ) => ({
            id: tempId,
            name: input.name,
            scope: 'read',
            token: 'temp-token-will-be-replaced',
            expires_at: null,
            expiry: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_used_at: null,
          }),
        },
        onSuccess: (res) => {
          irminAlert(
            'success',
            res.message ?? 'Credential created successfully'
          );
        },
        onError: (error) => {
          irminAlert('error', error.message ?? 'Error creating credential');
        },
      }
    ),
  });

  return {
    // Queries
    credentialsQuery,

    // Mutations
    deleteCredentialMutation,
    createCredentialMutation,
  };
}
