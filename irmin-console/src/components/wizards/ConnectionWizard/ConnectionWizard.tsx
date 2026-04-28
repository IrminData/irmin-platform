'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import type IrminCore from '@/lib/core';
import { connectionsQueryKey } from '@/lib/queryKeys';

import { useIrminCore } from '@/context/IrminCoreContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { Connection } from '@/types/core/Connection';
import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

import { shouldDeleteOAuthDraft } from './draftCleanup';
import ConfigureConnectionStep from './steps/ConfigureConnectionStep';
import ConnectOAuthStep from './steps/ConnectOAuthStep';
import DefineDetailsStep from './steps/DefineDetailsStep';
import DefineSettingsStep from './steps/DefineSettingsStep';
import SelectConnectorStep from './steps/SelectConnectorStep';
import type {
  ConnectionConfigurationSubmission,
  ConnectionWizardData,
  ConnectionWizardMode,
} from './types';
import { convertConnectionValuesToDynamicValues } from './utils';

/**
 * Initial connection wizard data state
 */
const initialWizardData: ConnectionWizardData = {
  name: '',
  description: '',
  connector: undefined,
  connectionDetailsFields: undefined,
  connectionSettingsFields: undefined,
  connectionDetails: undefined,
  connectionSettings: undefined,
  tags: [],
};

const buildInitialWizardData = (
  connection?: Connection
): ConnectionWizardData => {
  if (!connection) {
    return initialWizardData;
  }

  return {
    name: connection.name,
    description: connection.description,
    connector: connection.connector,
    connectionDetailsFields: undefined,
    connectionSettingsFields: undefined,
    connectionDetails: convertConnectionValuesToDynamicValues(
      connection.details
    ),
    connectionSettings: convertConnectionValuesToDynamicValues(
      connection.settings
    ),
    tags: connection.tags ?? [],
  };
};

/**
 * Main content component for the Connection Wizard
 *
 * Manages the wizard state and renders the appropriate step component
 * Can be used in standalone mode (in a modal) or embedded mode (inside another wizard)
 */
export default function ConnectionWizard({
  closeModal,
  currentStep,
  setCurrentStep,
  embedded = false,
  onComplete,
  onCancel,
  mode = 'create',
  initialConnection,
  onSubmitConfiguration,
}: {
  closeModal: () => void;
  currentStep: number;
  setCurrentStep: Dispatch<SetStateAction<number>>;
  embedded?: boolean;
  onComplete?: (connection: Connection) => void;
  onCancel?: () => void;
  mode?: ConnectionWizardMode;
  initialConnection?: Connection;
  onSubmitConfiguration?: (
    payload: ConnectionConfigurationSubmission
  ) => Promise<IrminAPIResponse<Connection>>;
}) {
  const wizardMode = mode ?? 'create';
  const totalSteps = wizardMode === 'edit' ? 3 : 4;
  const { getCore } = useIrminCore();
  const { workspaceSlug } = useWorkspaceContext();
  const queryClient = useQueryClient();

  const [wizardData, setWizardData] = useState<ConnectionWizardData>(() =>
    wizardMode === 'edit'
      ? buildInitialWizardData(initialConnection)
      : initialWizardData
  );
  const prevStepRef = useRef<number>(currentStep);

  // OAuth path: the wizard creates a draft connection in step 2 so the
  // OAuth start endpoint has an ID to attach to. The cleanup ref must
  // survive both wizardData resets (when the user clicks Back to step
  // 1) and React's unmount discarding wizardData. We track the draft
  // ID, the final-submit completion flag, and the workspace separately so the
  // unmount path doesn't depend on a stale getCore/workspaceSlug
  // closure if the workspace switches mid-flow.
  const draftCleanupRef = useRef<string | null>(null);
  const draftCommittedRef = useRef<boolean>(false);
  const draftWorkspaceRef = useRef<string>(workspaceSlug);
  const getCoreRef = useRef(getCore);
  useEffect(() => {
    getCoreRef.current = getCore;
  }, [getCore]);
  const queryClientRef = useRef(queryClient);
  useEffect(() => {
    queryClientRef.current = queryClient;
  }, [queryClient]);
  // wizardData ref so the OAuth-path submit reads the latest name /
  // description / tags even when the configure step queues a state
  // update inline before invoking onSubmitConfiguration. Without this,
  // the memoized callback closes over stale fields and the user's
  // last-edit description silently goes back to its earlier value.
  const wizardDataRef = useRef(wizardData);
  useEffect(() => {
    wizardDataRef.current = wizardData;
  }, [wizardData]);

  // deleteDraft: best-effort delete of the OAuth-path draft. Used by
  // both the unmount cleanup and by the explicit Back-to-step-1 path
  // (which fires before the wizardData reset clears draftConnectionID).
  // Skips only once the final configuration submit has committed the
  // draft. OAuth completion alone is not enough: if the user abandons
  // the wizard before step 4, the half-configured draft must be deleted.
  const deleteDraft = useCallback(async (): Promise<void> => {
    const draftID = draftCleanupRef.current;
    if (!shouldDeleteOAuthDraft(draftID, draftCommittedRef.current)) return;
    draftCleanupRef.current = null;
    try {
      const core: IrminCore = await getCoreRef.current();
      await core.connectionService.deleteConnection({
        workspace: draftWorkspaceRef.current,
        connectionID: draftID,
      });
      void queryClientRef.current.invalidateQueries({
        queryKey: connectionsQueryKey(draftWorkspaceRef.current),
      });
    } catch (e) {
      console.warn('Failed to clean up OAuth draft connection', e);
    }
  }, []);

  // Mirror wizardData → refs so the cleanup path can read current
  // values without re-running on every dep change.
  useEffect(() => {
    if (wizardData.draftConnectionID) {
      draftCleanupRef.current = wizardData.draftConnectionID;
      draftWorkspaceRef.current = workspaceSlug;
    } else {
      draftCleanupRef.current = null;
    }
  }, [wizardData.draftConnectionID, workspaceSlug]);
  useEffect(() => {
    draftCommittedRef.current = false;
  }, [wizardData.draftConnectionID]);

  // Unmount-only cleanup. Empty deps so the teardown runs exactly once
  // when the wizard goes away — not on every workspace switch or
  // getCore identity change.
  useEffect(() => {
    return () => {
      void deleteDraft();
    };
  }, [deleteDraft]);

  const isOAuthPath = useMemo(
    () =>
      wizardMode === 'create' &&
      !!wizardData.connector?.connection_oauth_config,
    [wizardMode, wizardData.connector?.connection_oauth_config]
  );

  // Reset wizard data when returning to step 1 from another step. If
  // the user has an unfinished OAuth draft, delete it before the reset
  // — otherwise the watcher effect would null draftCleanupRef and
  // unmount cleanup would skip the orphan.
  useEffect(() => {
    if (
      wizardMode === 'create' &&
      currentStep === 1 &&
      prevStepRef.current !== 1
    ) {
      void deleteDraft();
      queueMicrotask(() => {
        setWizardData(initialWizardData);
      });
    }
    prevStepRef.current = currentStep;
  }, [currentStep, wizardMode, deleteDraft]);

  // Function to go to the next step
  const goNext = useCallback(() => {
    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, setCurrentStep, totalSteps]);

  // Function to go back to the previous step
  const goBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep, setCurrentStep]);

  // Function to go to a specific step
  const goToStep = useCallback(
    (step: number) => {
      if (step >= 1 && step <= totalSteps) {
        setCurrentStep(step);
      }
    },
    [setCurrentStep, totalSteps]
  );

  // Function to update wizard data
  const updateWizardData = useCallback(
    (updates: Partial<ConnectionWizardData>) => {
      setWizardData((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  // OAuth-path final submit: the connection already exists (created in
  // step 2), so we PATCH name/description/configuration and apply tags
  // post-hoc instead of POST-creating. Mirrors the existing edit-mode
  // contract.
  const oauthSubmitConfiguration = useCallback(
    async (
      payload: ConnectionConfigurationSubmission
    ): Promise<IrminAPIResponse<Connection>> => {
      // Read the latest wizardData via ref so name/description/tag
      // edits made inline by ConfigureConnectionStep (which queues a
      // setState then awaits this callback) are not lost to the
      // memoized closure.
      const latest = wizardDataRef.current;
      const draftID = latest.draftConnectionID;
      if (!draftID) {
        throw new Error('Missing draft connection ID for OAuth submit');
      }
      const core = await getCore();
      // Push name/description in case the user edited them downstream.
      await core.connectionService.updateConnection({
        workspace: workspaceSlug,
        connectionID: draftID,
        name: latest.name,
        description: latest.description,
        documentation: '',
      });
      const res = await core.connectionService.updateConnectionConfiguration({
        workspace: workspaceSlug,
        connectionID: draftID,
        details: payload.details,
        settings: payload.settings,
      });
      // Don't clear draft tracking until we know the configuration
      // update actually succeeded. The caller (ConfigureConnectionStep)
      // throws if !res.data even though no exception was raised; if we
      // wipe draftConnectionID + draftCleanupRef before that check we
      // strand the user — retry can't find the draft and the unmount
      // cleanup won't see it either. Until draftCommittedRef flips
      // below, an unmount here still treats the draft as discardable
      // per policy: OAuth completion alone is not enough.
      if (!res.data) {
        return res;
      }
      // Configuration update succeeded — the draft is now a real,
      // user-committed connection. Mark it committed FIRST so an
      // unmount mid-tag-attachment (or any other late failure) leaves
      // the connection in place.
      draftCommittedRef.current = true;
      // Apply tags best-effort. Failures here don't block the wizard —
      // the user can fix them from the connection detail page.
      if (latest.tags && latest.tags.length > 0) {
        await Promise.all(
          latest.tags.map((tag) =>
            core.tagService
              .addTagToEntity({
                workspace: workspaceSlug,
                tagId: tag.id,
                entityType: 'connections',
                entityId: draftID,
              })
              .catch((err: unknown) => {
                console.warn('Failed to attach tag to OAuth connection', err);
              })
          )
        );
      }
      // Detach the draft from the cleanup path and clear the wizard's
      // local state. draftCommittedRef would already protect it from
      // deletion, but nulling the ref makes the intent explicit.
      draftCleanupRef.current = null;
      setWizardData((prev) => ({ ...prev, draftConnectionID: undefined }));
      return res;
    },
    [getCore, workspaceSlug]
  );

  return (
    <>
      {wizardMode === 'create' && currentStep === 1 && (
        <SelectConnectorStep
          updateWizardData={updateWizardData}
          goNext={goNext}
          onCancel={embedded ? onCancel : undefined}
        />
      )}
      {wizardMode === 'create' && currentStep === 2 && isOAuthPath && (
        <ConnectOAuthStep
          wizardData={wizardData}
          updateWizardData={updateWizardData}
          goBack={goBack}
          goNext={goNext}
        />
      )}
      {((wizardMode === 'create' && currentStep === 2 && !isOAuthPath) ||
        (wizardMode === 'edit' && currentStep === 1)) && (
        <DefineDetailsStep
          wizardData={wizardData}
          updateWizardData={updateWizardData}
          goBack={goBack}
          goNext={goNext}
          goToStep={goToStep}
          mode={wizardMode}
        />
      )}
      {((wizardMode === 'create' && currentStep === 3) ||
        (wizardMode === 'edit' && currentStep === 2)) && (
        <DefineSettingsStep
          wizardData={wizardData}
          updateWizardData={updateWizardData}
          goBack={goBack}
          goNext={goNext}
          mode={wizardMode}
        />
      )}
      {((wizardMode === 'create' && currentStep === 4) ||
        (wizardMode === 'edit' && currentStep === 3)) && (
        <ConfigureConnectionStep
          wizardData={wizardData}
          updateWizardData={updateWizardData}
          goBack={goBack}
          goToStep={goToStep}
          closeModal={closeModal}
          embedded={embedded}
          onComplete={onComplete}
          mode={wizardMode}
          onSubmitConfiguration={
            isOAuthPath ? oauthSubmitConfiguration : onSubmitConfiguration
          }
        />
      )}
    </>
  );
}
