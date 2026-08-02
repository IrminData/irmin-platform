import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  connectionOAuthStatusQueryKey,
  connectionQueryKey,
} from '@/lib/queryKeys';

import { useIrminCore } from '@/context/IrminCoreContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { isTempId } from '@/utils/generateTempId';

import type { ConnectionOAuthStatus } from '@/types/core/ConnectionOAuthStatus';
import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

const FIVE_MINUTES_MS = 5 * 60 * 1000;

/**
 * Read + manage OAuth status for a single connection. Status is polled
 * by the connection detail page; the 5-minute stale time matches the
 * roadmap's note that token state doesn't change fast enough to thrash.
 *
 * @param connectionID - SQID of the connection. Skipped when empty or
 *                      when the ID is a client-generated temp id (the
 *                      OAuth endpoints would 404 on those).
 */
export function useOAuthStatus(connectionID: string) {
  const { getCore } = useIrminCore();
  const { dict } = useLocale();
  const { workspaceSlug } = useWorkspaceContext();
  const queryClient = useQueryClient();
  const { irminAlert } = usePopup();

  const oauthStatusQuery = useQuery<IrminAPIResponse<ConnectionOAuthStatus>>({
    queryKey: connectionOAuthStatusQueryKey(workspaceSlug, connectionID),
    queryFn: async () => {
      const core = await getCore();
      return core.connectionOAuthService.getStatus({
        workspace: workspaceSlug,
        connectionID,
      });
    },
    enabled: !!connectionID && !isTempId(connectionID),
    staleTime: FIVE_MINUTES_MS,
  });

  const disconnectOAuthMutation = useMutation<IrminAPIResponse, Error, void>({
    mutationFn: async () => {
      const core = await getCore();
      return core.connectionOAuthService.disconnect({
        workspace: workspaceSlug,
        connectionID,
      });
    },
    onSuccess: (res) => {
      irminAlert(
        'success',
        res.message ?? dict.connections.oauth.disconnectSuccess
      );
      void queryClient.invalidateQueries({
        queryKey: connectionOAuthStatusQueryKey(workspaceSlug, connectionID),
      });
      void queryClient.invalidateQueries({
        queryKey: connectionQueryKey(workspaceSlug, connectionID),
      });
    },
    onError: (error) => {
      irminAlert(
        'error',
        error.message ?? dict.connections.oauth.disconnectError
      );
    },
  });

  return {
    oauthStatusQuery,
    disconnectOAuthMutation,
  };
}
