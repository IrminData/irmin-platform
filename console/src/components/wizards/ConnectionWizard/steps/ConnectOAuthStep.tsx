'use client';

import { useCallback, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { connectionsQueryKey } from '@/lib/queryKeys';

import ConnectorInfoSmall from '@/components/connector/ConnectorInfoSmall';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { useIrminCore } from '@/context/IrminCoreContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { useOAuthFlow } from '@/hooks/api';

import type { ConnectionWizardData } from '../types';

/**
 * OAuth connect step. Shown in place of `DefineDetailsStep` when the
 * selected connector exposes `connection_oauth_config`. The user picks
 * a name + description, then clicks Connect — which:
 *
 *   1. Creates a draft Connection record (empty details/settings).
 *   2. Runs the OAuth authorization-code flow against that draft.
 *   3. On success, marks `oauthCompleted` on the wizard and advances
 *      to the settings step.
 *
 * Cleanup policy (see ConnectionWizard.deleteDraft):
 *   - If the user cancels BEFORE OAuth completes (popup closed,
 *     wizard dismissed, Back to step 1), the parent wizard deletes
 *     the draft so the connections list stays clean.
 *   - If the user cancels AFTER OAuth completes, the draft is
 *     preserved. The user has already authorized the vendor; we
 *     don't throw that grant away. They can finish settings later
 *     from the connection detail page.
 */
export default function ConnectOAuthStep({
  wizardData,
  updateWizardData,
  goBack,
  goNext,
}: {
  wizardData: ConnectionWizardData;
  updateWizardData: (updates: Partial<ConnectionWizardData>) => void;
  goBack: () => void;
  goNext: () => void;
}) {
  const { dict } = useLocale();
  const { irminAlert } = usePopup();
  const { getCore } = useIrminCore();
  const { workspaceSlug } = useWorkspaceContext();
  const queryClient = useQueryClient();
  const { runFlow } = useOAuthFlow();

  const oauthConfig = wizardData.connector?.connection_oauth_config;
  const provider = oauthConfig?.provider ?? wizardData.connector?.name ?? '';

  const [name, setName] = useState<string>(
    () => wizardData.name || wizardData.connector?.name || 'Connection'
  );
  const [description, setDescription] = useState<string>(
    () => wizardData.description ?? ''
  );
  const [busy, setBusy] = useState(false);

  const handleConnect = useCallback(async () => {
    if (!wizardData.connector) return;
    setBusy(true);
    try {
      // Always sync the latest name/description into wizardData so the
      // configure step's PATCH submit picks up edits from this step,
      // including edits made between a failed first attempt and a retry.
      updateWizardData({ name, description });

      // If a draft already exists (the user clicked Connect, the popup
      // failed, and they're retrying), reuse it instead of creating a
      // second orphan record. The draft is created via the SDK
      // directly, NOT useConnections().createConnectionMutation — that
      // shared mutation fires a "Connection created successfully" toast
      // and an optimistic add to the connections list, which would
      // surface a half-configured draft to the user before OAuth even
      // starts. We invalidate the list cache after OAuth succeeds so
      // the row appears once it's actually usable.
      let draftID = wizardData.draftConnectionID;
      if (!draftID) {
        try {
          const core = await getCore();
          const created = await core.connectionService.createConnection({
            workspace: workspaceSlug,
            connectorID: wizardData.connector.id,
            name,
            description,
            documentation: '',
            connectionDetails: {},
            connectionSettings: {},
          });
          if (!created.data?.id) {
            irminAlert(
              'error',
              created.message ??
                dict.common.errors.mutations.createConnectionFailed
            );
            return;
          }
          draftID = created.data.id;
          updateWizardData({ draftConnectionID: draftID });
        } catch (createErr) {
          irminAlert(
            'error',
            (createErr as Error)?.message ??
              dict.common.errors.mutations.createConnectionFailed
          );
          return;
        }
      }

      const result = await runFlow({ connectionID: draftID });
      if (result.ok) {
        // The draft is now real (has a token). Surface it in the
        // connections list cache that we deliberately bypassed during
        // create.
        void queryClient.invalidateQueries({
          queryKey: connectionsQueryKey(workspaceSlug),
        });
        goNext();
        return;
      }

      const errors = dict.connections.oauth.errors;
      const key = (
        result.reason in errors ? result.reason : 'internal_error'
      ) as keyof typeof errors;
      irminAlert('error', result.description ?? errors[key]);
    } catch (error) {
      irminAlert(
        'error',
        (error as Error)?.message ??
          dict.connections.oauth.errors.internal_error
      );
    } finally {
      setBusy(false);
    }
  }, [
    wizardData.connector,
    wizardData.draftConnectionID,
    getCore,
    workspaceSlug,
    queryClient,
    name,
    description,
    runFlow,
    goNext,
    updateWizardData,
    irminAlert,
    dict,
  ]);

  if (!wizardData.connector || !oauthConfig) {
    return null;
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-col justify-center border-b pb-4'>
        <p className='mb-2 text-sm opacity-80'>
          {dict.connections.create.selectedConnector}:
        </p>
        <ConnectorInfoSmall connector={wizardData.connector} />
      </div>

      <div className='space-y-4'>
        <div className='space-y-2'>
          <Label htmlFor='oauth-connection-name'>
            {dict.connections.create.connectionName}
          </Label>
          <Input
            id='oauth-connection-name'
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={dict.connections.create.connectionNamePlaceholder}
          />
        </div>
        <div className='space-y-2'>
          <Label htmlFor='oauth-connection-description'>
            {dict.connections.create.connectionDescription}
          </Label>
          <Textarea
            id='oauth-connection-description'
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={
              dict.connections.create.connectionDescriptionPlaceholder
            }
            rows={3}
          />
        </div>
      </div>

      <div className='space-y-3 rounded-md border bg-muted/30 p-4'>
        <p className='text-sm font-medium'>
          {dict.connections.oauth.scopesExplainerTitle}
        </p>
        <p className='text-sm text-muted-foreground'>
          {dict.connections.oauth.scopesExplainerBody.replace(
            '{provider}',
            provider
          )}
        </p>
        {oauthConfig.scopes.length > 0 && (
          <ul className='flex flex-wrap gap-1.5'>
            {oauthConfig.scopes.map((scope) => (
              <li
                key={scope}
                className='
                  rounded-sm border bg-background px-2 py-0.5 font-mono text-xs
                '
              >
                {scope}
              </li>
            ))}
          </ul>
        )}
      </div>

      <Button
        className='w-full'
        onClick={handleConnect}
        disabled={busy || !name.trim()}
      >
        {busy
          ? dict.connections.oauth.connecting
          : dict.connections.oauth.connectWithProvider.replace(
              '{provider}',
              provider
            )}
      </Button>

      <Button className='w-full' variant='ghost' size='sm' onClick={goBack}>
        {dict.connections.create.goBack}
      </Button>
    </div>
  );
}
