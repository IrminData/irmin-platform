import { useCallback, useRef, useState } from 'react';

import {
  createSystemToken,
  revokeSystemToken,
} from '@/lib/actions/credentials';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { APIToken } from '@/types/core/APIToken';

export const useSystemTokens = ({
  initialTokens,
}: {
  initialTokens: APIToken[];
}) => {
  const { dict } = useLocale();
  const { irminConfirm, irminAlert } = usePopup();
  const [tokens, setTokens] = useState<APIToken[]>(initialTokens);

  const creatingToken = useRef(false);
  const [createdToken, setCreatedToken] = useState('');

  /**
   * Hook to create a new API token with the provided name and expiration time
   */
  const createToken = useCallback(
    async (validFor: number, name: string) => {
      if (creatingToken.current) return;
      creatingToken.current = true;
      try {
        const res = await createSystemToken({ name, expiry: validFor });
        if (res.data) {
          irminAlert(
            'success',
            res?.message ?? 'API token created successfully'
          );
          setTokens((prev) => [...prev, res.data as APIToken]);
          setCreatedToken(res.data.token ?? '');
        }
      } catch (error) {
        console.error('Failed to create workspace', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to create new API token'
        );
      } finally {
        creatingToken.current = false;
      }
    },
    [irminAlert]
  );

  const removingToken = useRef(false);

  /**
   * Hook to revoke an API token
   */
  const revokeToken = useCallback(
    async (token: APIToken) => {
      const confirmed = await irminConfirm(
        'warning',
        `${dict.common.areYouSureYouWantToDelete}: ${token.name}`
      );
      if (!confirmed) return;
      if (removingToken.current) return;
      removingToken.current = true;
      try {
        const res = await revokeSystemToken({ tokenId: token.id });
        irminAlert('success', res?.message ?? 'API token revoked successfully');
        setTokens((prev) => prev.filter((t) => t.id !== token.id));
      } catch (error) {
        console.error('Failed to create workspace', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to create new API token'
        );
      } finally {
        removingToken.current = false;
      }
    },
    [dict, irminConfirm, irminAlert]
  );

  return {
    tokens,
    createToken,
    createdToken,
    revokeToken,
  };
};
