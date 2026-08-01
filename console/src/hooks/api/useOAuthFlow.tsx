import { useCallback, useEffect, useRef } from 'react';

import { clientEnv } from '@/config/env.client';

import { useIrminCore } from '@/context/IrminCoreContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

/**
 * Wire-protocol message type strings shared with Core's OAuth callback HTML
 * (controllers/connection-oauth.go::buildCallbackHTML). Constants so a typo
 * is a compile error rather than a silent listener mismatch.
 */
const OAUTH_MESSAGE_SUCCESS = 'irmin:oauth:success' as const;
const OAUTH_MESSAGE_ERROR = 'irmin:oauth:error' as const;

/**
 * postMessage shape Core sends from the OAuth callback HTML
 * (controllers/connection-oauth.go). We only trust messages whose
 * `event.origin` matches the API base URL, since postMessage is
 * otherwise origin-free.
 *
 * Core's success path includes `connectionId` (the connection's SQID) when
 * the SQID encode succeeds; it falls back to a generic success without the
 * field if encoding fails. The listener below treats a missing ID as
 * "trust the per-flow window-name isolation" (see runFlow body).
 */
type OAuthCallbackMessage =
  | { type: typeof OAUTH_MESSAGE_SUCCESS; connectionId?: string }
  | {
      type: typeof OAUTH_MESSAGE_ERROR;
      error: string;
      description?: string;
    };

const isCallbackMessage = (value: unknown): value is OAuthCallbackMessage => {
  if (!value || typeof value !== 'object') return false;
  const t = (value as { type?: unknown }).type;
  return t === OAUTH_MESSAGE_SUCCESS || t === OAUTH_MESSAGE_ERROR;
};

/**
 * Discriminated set of failure reasons for the OAuth flow. Codes from Core's
 * classifyCallbackError plus our own client-side codes (popup_*, timeout,
 * unmounted). Typed as a union so dict.connections.oauth.errors lookups are
 * compile-time-validated and a typo or removed key is a build error.
 */
export type OAuthFailureReason =
  | 'state_invalid'
  | 'config_unavailable'
  | 'refresh_rejected'
  | 'not_connected'
  | 'vendor_error'
  | 'internal_error'
  | 'popup_blocked'
  | 'popup_closed'
  | 'timeout'
  | 'unmounted';

/**
 * Result of running an OAuth flow. `ok: false` carries the vendor- or
 * client-side reason code so the UI can show a targeted retry CTA.
 */
export type OAuthFlowResult =
  | { ok: true }
  | { ok: false; reason: OAuthFailureReason; description?: string };

const POPUP_WIDTH = 600;
const POPUP_HEIGHT = 700;
const FLOW_TIMEOUT_MS = 5 * 60 * 1000;
const POPUP_POLL_MS = 500;
// Don't start polling `popup.closed` immediately. Cross-origin
// navigation (console → vendor → api.irmin.dev) and Cross-Origin-
// Opener-Policy can make `popup.closed` flicker to `true` during the
// transition, even though the popup is genuinely open at the vendor's
// authorize page. Skip the first few seconds so the user can actually
// see the OAuth screen.
const POPUP_POLL_START_DELAY_MS = 3000;
// Grace period after observing `popup.closed`. The callback HTML
// posts a message then calls `window.close()`; we wait long enough
// for any in-flight postMessage to land before declaring the popup
// dead. Generous on purpose — false positives here mean the user
// sees a "popup closed" error while their authorize screen is still
// open in front of them.
const POPUP_CLOSE_GRACE_MS = 5000;
// Status polling: parallel to the postMessage path, we poll Core for
// the connection's OAuth status. Vital fallback when the popup's
// opener relationship is severed by Cross-Origin-Opener-Policy on a
// page in the redirect chain (e.g. `mcp.linear.app/callback`) — in
// that case postMessage can never reach us, but Core still has the
// truth, and a freshly-issued token from the status endpoint resolves
// the flow regardless. Don't start polling immediately — give the user
// a window to authorize without firing requests every 2 s for a
// status that hasn't changed yet. Visibility-gated so we don't burn
// requests when the console tab is hidden (the user is in the popup).
const STATUS_POLL_START_DELAY_MS = 5000;
const STATUS_POLL_INTERVAL_MS = 2500;

const POPUP_FEATURES = (): string => {
  if (typeof window === 'undefined') {
    return `width=${POPUP_WIDTH},height=${POPUP_HEIGHT}`;
  }
  const left = window.screenX + (window.outerWidth - POPUP_WIDTH) / 2;
  const top = window.screenY + (window.outerHeight - POPUP_HEIGHT) / 2;
  return `width=${POPUP_WIDTH},height=${POPUP_HEIGHT},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`;
};

/**
 * Best-effort unique window name. crypto.randomUUID is widely available in
 * modern browsers; we fall back to a timestamp+Math.random combo for any
 * legacy environment so two concurrent flows never share a popup slot.
 */
const buildPopupName = (connectionID: string): string => {
  const c =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `irmin-oauth-${connectionID}-${c}`;
};

/**
 * Run an OAuth authorization-code flow against an existing Connection.
 *
 * Resolves with `{ ok: true }` after Core's callback page posts an
 * `irmin:oauth:success` message back to the opener (or after status
 * polling sees a freshly-issued token), or with `{ ok: false, reason }`
 * on error / timeout / popup-closed / unmount.
 */
export function useOAuthFlow(): {
  runFlow: (props: { connectionID: string }) => Promise<OAuthFlowResult>;
} {
  const { getCore } = useIrminCore();
  const { workspaceSlug } = useWorkspaceContext();

  // Stash references so we can tear down listeners + intervals from
  // multiple resolution paths without leaks. settleRef is paired with
  // cleanupRef so the unmount effect can resolve the in-flight promise
  // (otherwise the awaiting caller's async frame hangs forever, retaining
  // captured closures until process exit).
  const cleanupRef = useRef<(() => void) | null>(null);
  const settleRef = useRef<((result: OAuthFlowResult) => void) | null>(null);
  // mountedRef defends a narrow window: between the start of runFlow and
  // the line that assigns settleRef.current = settle, a component unmount
  // would clear settleRef but the in-flight async work (getCore, getStatus,
  // startFlow) keeps marching toward window.open(). Without this flag, we
  // open a popup and wire up listeners + intervals on a host that no
  // longer exists, and the caller's `await runFlow()` hangs until the
  // 5-minute timeout fires. Each await checkpoint short-circuits with an
  // 'unmounted' result if the component went away during the await.
  const mountedRef = useRef(true);

  // Unmount: settle the outstanding flow with a stable reason so the
  // caller's `.finally(setBusy(false))` runs and any captured closures
  // are released. cleanup() runs as a side effect of settle(). Setting
  // mountedRef here also short-circuits any runFlow that's mid-await on
  // getCore/getStatus/startFlow — once the await resumes it sees
  // mountedRef.current === false and returns early instead of opening
  // an orphan popup.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      settleRef.current?.({
        ok: false,
        reason: 'unmounted',
        description: 'The component running the OAuth flow was unmounted.',
      });
    };
  }, []);

  const runFlow = useCallback(
    async ({
      connectionID,
    }: {
      connectionID: string;
    }): Promise<OAuthFlowResult> => {
      // Tear down any prior in-flight flow before starting a new one.
      // settle the prior flow first so its caller's promise resolves.
      settleRef.current?.({
        ok: false,
        reason: 'popup_closed',
        description:
          'A new OAuth flow was started; the prior one was abandoned.',
      });

      // bailIfUnmounted guards every async checkpoint between here and
      // the popup-open line. If a parent unmounted during an await
      // (closing the wizard mid-fetch, navigating away), settleRef is
      // already null and the in-flight popup machinery would leak. We
      // surface 'unmounted' so the caller's `.finally` runs.
      const bailIfUnmounted = (): OAuthFlowResult | null =>
        mountedRef.current
          ? null
          : {
              ok: false,
              reason: 'unmounted',
              description:
                'The component running the OAuth flow was unmounted before the popup opened.',
            };

      const core = await getCore();
      {
        const bail = bailIfUnmounted();
        if (bail) return bail;
      }

      // Snapshot the current OAuth status before opening the popup. Used
      // to detect a "freshly-issued token" via status polling — without a
      // baseline, polling resolves ok:true on a pre-existing connection
      // (e.g., user clicks Reconnect on a still-valid grant then closes
      // the popup; polling sees the OLD token and falsely declares
      // success). The snapshot lets us require a strictly-newer
      // last_refresh_at OR a "was disconnected, now connected" transition
      // before resolving via the polling path.
      //
      // baselineFetchSucceeded is the load-bearing flag. If the pre-fetch
      // fails (network blip, transient 401), we cannot tell pre-existing
      // tokens from freshly-issued ones — defaulting baselineConnected
      // to false would false-positive every Reconnect because the very
      // first poll would see the existing token and fire
      // transitionedToConnected = !false && true = true. The honest
      // conservative behavior is: skip the polling-resolution path
      // entirely on this flow and rely on postMessage / popup-closed /
      // timeout signals.
      let baselineFetchSucceeded = false;
      let baselineLastRefreshAt: string | undefined;
      let baselineConnected = false;
      try {
        const before = await core.connectionOAuthService.getStatus({
          workspace: workspaceSlug,
          connectionID,
        });
        baselineFetchSucceeded = true;
        baselineConnected = !!before.data?.connected;
        baselineLastRefreshAt = before.data?.last_refresh_at ?? undefined;
      } catch {
        // Polling is disabled below when this flag is false.
        baselineFetchSucceeded = false;
      }
      {
        const bail = bailIfUnmounted();
        if (bail) return bail;
      }

      const res = await core.connectionOAuthService.startFlow({
        workspace: workspaceSlug,
        connectionID,
      });
      {
        const bail = bailIfUnmounted();
        if (bail) return bail;
      }
      const authURL = res.data?.authorization_url;
      if (!authURL) {
        return {
          ok: false,
          reason: 'internal_error',
          description: 'Missing authorization URL in start response.',
        };
      }

      // Defense-in-depth: refuse anything that isn't an http(s) URL,
      // even if the API returns it. Blocks `javascript:` / `data:` URLs
      // from ever reaching window.open and executing in the popup
      // context with access to window.opener.
      try {
        const protocol = new URL(authURL).protocol;
        if (protocol !== 'https:' && protocol !== 'http:') {
          return {
            ok: false,
            reason: 'internal_error',
            description: 'Authorization URL has an unsupported scheme.',
          };
        }
      } catch {
        return {
          ok: false,
          reason: 'internal_error',
          description: 'Authorization URL is not a valid URL.',
        };
      }

      // Per-flow unique window name. Defends against cross-flow popup
      // hijack: two tabs opening OAuth simultaneously with a fixed name
      // would have the second window.open navigate the FIRST tab's
      // popup, with the success message resolving the wrong flow. The
      // UUID suffix guarantees a fresh popup per invocation.
      const popupName = buildPopupName(connectionID);
      const popup = window.open(authURL, popupName, POPUP_FEATURES());
      if (!popup) {
        return {
          ok: false,
          reason: 'popup_blocked',
          description: 'The browser blocked the OAuth popup window.',
        };
      }

      const apiOrigin = new URL(clientEnv.NEXT_PUBLIC_API_URL).origin;

      return new Promise<OAuthFlowResult>((resolve) => {
        let settled = false;
        const settle = (result: OAuthFlowResult) => {
          if (settled) return;
          settled = true;
          cleanup();
          resolve(result);
        };

        const onMessage = (event: MessageEvent) => {
          // Only trust messages from the Core API origin. The callback
          // HTML sends `event.origin === api.irmin.dev` (or local dev
          // equivalent); anything else is an unrelated frame and must
          // be ignored to avoid spoofed completion.
          //
          // We deliberately do NOT check `event.source === popup`:
          // cross-origin navigation chains (vendor → api.irmin.dev)
          // and Cross-Origin-Opener-Policy can swap out the popup's
          // WindowProxy, so the comparison rejects valid success
          // messages and the user gets a false `popup_closed`. Origin
          // is the real defense here.
          if (event.origin !== apiOrigin) return;
          if (!isCallbackMessage(event.data)) return;

          if (event.data.type === OAUTH_MESSAGE_SUCCESS) {
            // If the callback included a connectionId, require it to
            // match the in-flight ID before settling. Defends against
            // cross-flow message confusion: a success message from
            // another tab's flow on the same console origin would
            // otherwise spuriously resolve this flow with the wrong
            // connection. Core includes the SQID on every successful
            // callback (controllers/connection-oauth.go); a missing
            // value falls through to the per-flow window-name defense.
            if (
              event.data.connectionId !== undefined &&
              event.data.connectionId !== connectionID
            ) {
              return;
            }
            settle({ ok: true });
            return;
          }
          settle({
            ok: false,
            reason: event.data.error as OAuthFailureReason,
            description: event.data.description,
          });
        };

        // Grace timer is set once popup.closed is observed; if a
        // success/error message arrives before it fires, we settle
        // with the message instead of with popup_closed.
        let closeGraceTimer: number | null = null;
        let popupTimer: number | null = null;
        // Defer popup.closed polling so cross-origin navigation has
        // time to settle without tripping a false close detection.
        const pollStartTimer = window.setTimeout(() => {
          popupTimer = window.setInterval(() => {
            if (popup.closed && closeGraceTimer === null) {
              closeGraceTimer = window.setTimeout(() => {
                settle({
                  ok: false,
                  reason: 'popup_closed',
                  description: 'The OAuth window was closed before completion.',
                });
              }, POPUP_CLOSE_GRACE_MS);
            }
          }, POPUP_POLL_MS);
        }, POPUP_POLL_START_DELAY_MS);

        // Status-poll fallback. Runs in parallel with the postMessage
        // listener. Wins when the popup's opener was severed by COOP
        // somewhere in the redirect chain and the callback page can't
        // postMessage back. Uses the same Core endpoint the connection
        // detail card reads, so behavior is consistent.
        //
        // Resolution rule (anti-false-success): only settle ok:true when
        // either (a) baseline was disconnected and we now see connected,
        // or (b) baseline last_refresh_at was either absent or strictly
        // older than the polled value. Otherwise we'd resolve on a
        // pre-existing token if the user closed the popup without
        // authorizing.
        //
        // CRITICAL: gated on baselineFetchSucceeded. If the pre-flight
        // fetch failed we have no truth-snapshot to compare against, so
        // any polled `connected: true` is ambiguous between "fresh grant"
        // and "pre-existing token". For Reconnect specifically, that
        // ambiguity is a false-positive (the existing token would
        // resolve the flow even if the user closed the popup without
        // authorizing). When in doubt, do nothing — postMessage and the
        // popup-closed/timeout signals still work.
        let statusTimer: number | null = null;
        let statusInFlight = false;
        const statusStartTimer = window.setTimeout(() => {
          if (!baselineFetchSucceeded) return;
          statusTimer = window.setInterval(() => {
            // Visibility-gated: skip polling when the console tab is
            // hidden. The user is almost certainly in the OAuth popup;
            // status hasn't changed yet, and we save Core load.
            // postMessage-based resolution still works in any visibility
            // state because it's event-driven.
            if (typeof document !== 'undefined' && document.hidden) return;
            if (statusInFlight) return;
            statusInFlight = true;
            void (async () => {
              try {
                const statusRes = await core.connectionOAuthService.getStatus({
                  workspace: workspaceSlug,
                  connectionID,
                });
                const polledConnected = !!statusRes.data?.connected;
                const polledLastRefreshAt =
                  statusRes.data?.last_refresh_at ?? undefined;

                const transitionedToConnected =
                  !baselineConnected && polledConnected;
                const lastRefreshIsNewer =
                  polledConnected &&
                  polledLastRefreshAt !== undefined &&
                  polledLastRefreshAt !== baselineLastRefreshAt;

                if (transitionedToConnected || lastRefreshIsNewer) {
                  settle({ ok: true });
                }
              } catch {
                // Network blips here are expected (the user might not
                // be done authorizing yet, or Core might be slow).
                // Keep polling; the overall flow timeout still bounds
                // total wait time.
              } finally {
                statusInFlight = false;
              }
            })();
          }, STATUS_POLL_INTERVAL_MS);
        }, STATUS_POLL_START_DELAY_MS);

        const timeout = window.setTimeout(() => {
          settle({
            ok: false,
            reason: 'timeout',
            description: 'The OAuth flow took too long to complete.',
          });
        }, FLOW_TIMEOUT_MS);

        const cleanup = () => {
          window.removeEventListener('message', onMessage);
          window.clearTimeout(pollStartTimer);
          if (popupTimer !== null) {
            window.clearInterval(popupTimer);
            popupTimer = null;
          }
          window.clearTimeout(statusStartTimer);
          if (statusTimer !== null) {
            window.clearInterval(statusTimer);
            statusTimer = null;
          }
          window.clearTimeout(timeout);
          if (closeGraceTimer !== null) {
            window.clearTimeout(closeGraceTimer);
            closeGraceTimer = null;
          }
          if (!popup.closed) {
            try {
              popup.close();
            } catch {
              // Ignore cross-origin close errors; the popup may have
              // navigated to the vendor and lost reference access.
            }
          }
          cleanupRef.current = null;
          settleRef.current = null;
        };

        cleanupRef.current = cleanup;
        settleRef.current = settle;
        window.addEventListener('message', onMessage);
      });
    },
    [getCore, workspaceSlug]
  );

  return { runFlow };
}
