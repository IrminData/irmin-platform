import { useCallback } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { workflowRunQueryKey } from '@/lib/queryKeys';

import { useIrminCore } from '@/context/IrminCoreContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { WorkflowRun } from '@/types/core/WorkflowRun';

/** Input identifying which run to cancel. */
export type CancelWorkflowRunInput = {
  workflowID: string;
  runID: string;
};

/**
 * Snapshot taken in onMutate so we can roll the optimistic
 * 'cancelling' status back when the server rejects the cancel.
 */
type CancelOptimisticSnapshot = {
  /** The single-run cache value before we touched it. */
  singleRun?: IrminAPIResponse<WorkflowRun>;
  /** Every paginated list cache that contained the row, keyed by
   *  serialised query key, paired with its prior value. */
  lists: { key: unknown[]; value: unknown }[];
};

/**
 * Custom hook for cancelling an in-flight workflow run.
 *
 * Returns a mutation plus a `confirmAndCancel(input)` helper that
 * gates the mutation behind {@link usePopup}'s confirm dialog. The
 * mutation optimistically flips the run's status to `'cancelling'`
 * across the single-run cache and any paginated list caches; on
 * success the server's authoritative `'cancelled'` status (with
 * logs collected up to the cancellation point) replaces the
 * optimistic value, and on error we restore the prior snapshots.
 *
 * The hook is workflow-agnostic — workflowID is part of the mutation
 * input rather than a hook parameter — so the workspace-wide "All
 * runs" list can use a single hook instance to cancel runs across
 * different workflows.
 */
export const useCancelWorkflowRun = () => {
  const { getCore } = useIrminCore();
  const { irminAlert, irminConfirm } = usePopup();
  const { dict } = useLocale();
  const { workspaceSlug } = useWorkspaceContext();
  const queryClient = useQueryClient();

  const cancelMutation = useMutation<
    IrminAPIResponse<WorkflowRun>,
    Error,
    CancelWorkflowRunInput,
    CancelOptimisticSnapshot
  >({
    mutationFn: async ({ workflowID, runID }) => {
      const core = await getCore();
      return core.workflowRunService.cancelWorkflowRun({
        workspace: workspaceSlug,
        workflowID,
        runID,
      });
    },
    onMutate: async ({ workflowID, runID }) => {
      await queryClient.cancelQueries({
        queryKey: workflowRunQueryKey(workspaceSlug, workflowID, runID),
      });

      const singleRun = queryClient.getQueryData<IrminAPIResponse<WorkflowRun>>(
        workflowRunQueryKey(workspaceSlug, workflowID, runID)
      );

      if (singleRun?.data) {
        queryClient.setQueryData<IrminAPIResponse<WorkflowRun>>(
          workflowRunQueryKey(workspaceSlug, workflowID, runID),
          {
            ...singleRun,
            data: { ...singleRun.data, status: 'cancelling' },
          }
        );
      }

      // Pick up every paginated list that might contain this row —
      // the per-workflow list, the workspace-wide "all" list, and
      // every page of either. workflowRunsQueryKey's prefix
      // ['workflow-runs', workspaceSlug] catches all of them.
      const lists: CancelOptimisticSnapshot['lists'] = [];
      const listEntries = queryClient.getQueriesData<
        IrminAPIResponse<WorkflowRun[]>
      >({
        queryKey: ['workflow-runs', workspaceSlug],
      });

      for (const [key, value] of listEntries) {
        if (!value?.data?.some((run) => run.id === runID)) continue;
        lists.push({ key: [...key], value });
        queryClient.setQueryData<IrminAPIResponse<WorkflowRun[]>>(key, {
          ...value,
          data: value.data.map((run) =>
            run.id === runID ? { ...run, status: 'cancelling' } : run
          ),
        });
      }

      return { singleRun, lists };
    },
    onError: (error, { workflowID, runID }, context) => {
      if (context?.singleRun) {
        queryClient.setQueryData(
          workflowRunQueryKey(workspaceSlug, workflowID, runID),
          context.singleRun
        );
      }
      for (const { key, value } of context?.lists ?? []) {
        queryClient.setQueryData(key, value);
      }
      // `??` only catches null/undefined; an Error thrown from a
      // network abort or a generic fetch rejection can carry an empty
      // string message, which would render a blank toast. `||` falls
      // back on the empty case too.
      irminAlert('error', error.message || dict.workflow.cancelRun.failed);
    },
    onSuccess: (res, { workflowID }) => {
      // Server returns the authoritative cancelled run with logs
      // collected up to the cancellation point. Drop it into the
      // single-run cache so the detail page renders the final state
      // without waiting for the next poll tick.
      if (res.data) {
        queryClient.setQueryData(
          workflowRunQueryKey(workspaceSlug, workflowID, res.data.id),
          res
        );
      }
      // Invalidate every list cache for this workspace so the row
      // refetches with the canonical 'cancelled' status (and any
      // sibling rows whose state moved while the mutation was in
      // flight).
      void queryClient.invalidateQueries({
        queryKey: ['workflow-runs', workspaceSlug],
      });
      irminAlert('success', dict.workflow.cancelRun.success);
    },
  });

  /**
   * Confirms with the user, then triggers the cancel mutation.
   *
   * @param input - The workflow + run identifiers.
   * @returns A promise resolving once the user has answered the
   *   confirm dialog and (if confirmed) the mutation has settled.
   */
  const { mutateAsync: cancelMutateAsync } = cancelMutation;
  const confirmAndCancel = useCallback(
    async (input: CancelWorkflowRunInput) => {
      const confirmed = await irminConfirm(
        'warning',
        dict.workflow.cancelRun.confirm
      );
      if (!confirmed) return;
      await cancelMutateAsync(input);
    },
    [cancelMutateAsync, irminConfirm, dict.workflow.cancelRun.confirm]
  );

  return {
    cancelMutation,
    confirmAndCancel,
  };
};
