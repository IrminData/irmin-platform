'use client';

import { useCallback, useState } from 'react';

import { TbAlertCircle, TbPlugConnected, TbRefresh } from 'react-icons/tb';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { useConnectionContext } from '@/context/ConnectionContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { useOAuthFlow, useOAuthStatus } from '@/hooks/api';
import { useResourceAllowed } from '@/hooks/utils';

import { formatRelativeTime } from '@/utils/formatTimestamp';

/**
 * OAuth status card on the connection detail page. Shown only when the
 * connection's connector exposes `connection_oauth_config`.
 *
 * - Surfaces the current token status (connected, refresh-pending,
 *   disconnected) with last-refresh + expiry timing.
 * - Lets users Reconnect (re-runs the OAuth flow against the existing
 *   connection ID — preserves history) or Disconnect (best-effort
 *   vendor revocation, removes local token).
 */
const ConnectionOAuthCard = () => {
  const { dict, locale } = useLocale();
  const { irminAlert, irminConfirm } = usePopup();
  const { connectionID, connectionQuery } = useConnectionContext();
  const { isResourceAllowed } = useResourceAllowed();
  const { oauthStatusQuery, disconnectOAuthMutation } =
    useOAuthStatus(connectionID);
  const { runFlow } = useOAuthFlow();
  const [reconnecting, setReconnecting] = useState(false);

  const connection = connectionQuery.data?.data;
  const oauthConfig = connection?.connector.connection_oauth_config;
  const canUpdate = isResourceAllowed('connection', 'update', connectionID);

  // refetch is stable across renders for the same query; depending on the
  // whole query object reidentifies handleReconnect on every render and
  // defeats the useCallback memo. Match the pattern used in ConnectOAuthStep
  // and use the same error-key lookup so reconnect and connect render
  // identical messages for identical reasons.
  const refetchOAuthStatus = oauthStatusQuery.refetch;
  const handleReconnect = useCallback(async () => {
    setReconnecting(true);
    try {
      const result = await runFlow({ connectionID });
      if (result.ok) {
        irminAlert('success', dict.connections.oauth.reconnectSuccess);
        await refetchOAuthStatus();
        return;
      }
      const errors = dict.connections.oauth.errors;
      const message =
        result.description ??
        (result.reason in errors
          ? errors[result.reason as keyof typeof errors]
          : errors.internal_error);
      irminAlert('error', message);
    } catch (error) {
      irminAlert(
        'error',
        (error as Error)?.message ??
          dict.connections.oauth.errors.internal_error
      );
    } finally {
      setReconnecting(false);
    }
  }, [runFlow, connectionID, refetchOAuthStatus, irminAlert, dict]);

  // Same pattern as handleReconnect above: depend on the stable
  // mutateAsync reference rather than the whole mutation object so the
  // useCallback memo isn't invalidated on every render of useOAuthStatus.
  const disconnectOAuthMutateAsync = disconnectOAuthMutation.mutateAsync;
  const handleDisconnect = useCallback(async () => {
    const confirmed = await irminConfirm(
      'warning',
      dict.connections.oauth.confirmDisconnect
    );
    if (!confirmed) return;
    try {
      await disconnectOAuthMutateAsync();
    } catch {
      // disconnectOAuthMutation's onError already surfaces the failure
      // via irminAlert. Swallow the rejection here so it doesn't
      // propagate as an unhandled promise rejection.
    }
  }, [disconnectOAuthMutateAsync, irminConfirm, dict]);

  if (!oauthConfig) return null;

  const status = oauthStatusQuery.data?.data;
  const provider = oauthConfig.provider;
  const isLoading = oauthStatusQuery.isLoading;
  const connected = !!status?.connected;
  const needsRefresh = !!status?.needs_refresh;

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between gap-3'>
          <CardTitle className='flex items-center gap-2'>
            <TbPlugConnected aria-hidden='true' className='size-4' />
            {dict.connections.oauth.statusTitle}
          </CardTitle>
          {!isLoading &&
            (connected ? (
              needsRefresh ? (
                <Badge variant='outline' className='border-amber-500/50'>
                  {dict.connections.oauth.statusBadgeNeedsRefresh}
                </Badge>
              ) : (
                <Badge variant='outline'>
                  {dict.connections.oauth.statusBadgeConnected}
                </Badge>
              )
            ) : (
              <Badge variant='outline' className='border-destructive/50'>
                {dict.connections.oauth.statusBadgeDisconnected}
              </Badge>
            ))}
        </div>
      </CardHeader>
      <CardContent className='space-y-4'>
        {isLoading ? (
          <div className='h-16 w-full animate-pulse rounded-sm bg-muted' />
        ) : connected ? (
          <div className='space-y-3 text-sm'>
            <div className='flex flex-col gap-1'>
              <span className='text-muted-foreground'>
                {dict.connections.oauth.providerLabel}
              </span>
              <span className='font-medium'>{provider}</span>
            </div>
            {status?.last_refresh_at && (
              <div className='flex flex-col gap-1'>
                <span className='text-muted-foreground'>
                  {dict.connections.oauth.lastRefreshLabel}
                </span>
                <span>
                  {formatRelativeTime(status.last_refresh_at, locale)}
                </span>
              </div>
            )}
            {status?.expires_at && (
              <div className='flex flex-col gap-1'>
                <span className='text-muted-foreground'>
                  {dict.connections.oauth.expiresAtLabel}
                </span>
                <span>{formatRelativeTime(status.expires_at, locale)}</span>
              </div>
            )}
            {status?.scope && (
              <div className='flex flex-col gap-1.5'>
                <span className='text-muted-foreground'>
                  {dict.connections.oauth.scopesLabel}
                </span>
                <ul className='flex flex-wrap gap-1.5'>
                  {status.scope
                    .split(/[\s,]+/)
                    .filter(Boolean)
                    .map((s) => (
                      <li
                        key={s}
                        className={`
                          rounded-sm border bg-muted/40 px-2 py-0.5 font-mono
                          text-xs
                        `}
                      >
                        {s}
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div
            className={`
              flex items-start gap-2 rounded-sm border border-amber-500/40
              bg-amber-500/10 p-3 text-sm
            `}
          >
            <TbAlertCircle
              aria-hidden='true'
              className='mt-0.5 size-4 shrink-0'
            />
            <div className='space-y-1'>
              <p className='font-medium'>
                {dict.connections.oauth.disconnectedTitle}
              </p>
              <p className='text-muted-foreground'>
                {dict.connections.oauth.disconnectedBody.replace(
                  '{provider}',
                  provider
                )}
              </p>
            </div>
          </div>
        )}

        {canUpdate && (
          <div className='flex flex-wrap gap-2'>
            <Button size='sm' onClick={handleReconnect} disabled={reconnecting}>
              <TbRefresh aria-hidden='true' className='mr-1.5 size-4' />
              {connected
                ? dict.connections.oauth.reconnect
                : dict.connections.oauth.connectWithProvider.replace(
                    '{provider}',
                    provider
                  )}
            </Button>
            {connected && (
              <Button
                size='sm'
                variant='outline'
                onClick={handleDisconnect}
                disabled={disconnectOAuthMutation.isPending}
              >
                {dict.connections.oauth.disconnect}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ConnectionOAuthCard;
