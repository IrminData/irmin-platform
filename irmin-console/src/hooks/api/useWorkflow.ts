import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { workflowQueryKey, workflowsQueryKey } from '@/lib/queryKeys';

import { useIrminCore } from '@/context/IrminCoreContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { WorkflowSchedule } from '@/types/core/Schedule';
import type {
  Workflow,
  Workflowable,
  WorkflowStatus,
} from '@/types/core/Workflow';

import {
  deleteMutationHandlers,
  updateMutationHandlers,
} from './mutations/utils';

type UpdateWorkflowInput = {
  name: string;
  description: string;
  documentation: string;
};

export function useWorkflow(workflowID: string) {
  const { getCore } = useIrminCore();
  const { irminAlert } = usePopup();
  const { dict } = useLocale();
  const { workspaceSlug } = useWorkspaceContext();
  const queryClient = useQueryClient();
  const workflowQuery = useQuery<IrminAPIResponse<Workflow>, Error>({
    queryKey: workflowQueryKey(workspaceSlug, workflowID),
    queryFn: async () => {
      const core = await getCore();
      const workflow = await core.workflowService.fetchWorkflow({
        workspace: workspaceSlug,
        workflowID,
      });
      return workflow;
    },
    initialData: () => {
      const workflows = queryClient.getQueryData<IrminAPIResponse<Workflow[]>>(
        workflowsQueryKey(workspaceSlug)
      );
      return workflows?.data?.find((w: Workflow) => w.id === workflowID)
        ? {
            data: workflows.data.find((w: Workflow) => w.id === workflowID),
            success: true,
            message: 'Cached data',
          }
        : undefined;
    },
  });

  const deleteWorkflowMutation = useMutation<IrminAPIResponse, Error, string>({
    mutationFn: async (workflowIdToDelete: string) => {
      const core = await getCore();
      const response = await core.workflowService.deleteWorkflow({
        workspace: workspaceSlug,
        workflowID: workflowIdToDelete,
      });
      return response;
    },
    ...deleteMutationHandlers<Workflow>(queryClient, {
      cacheConfig: {
        primaryQueryKey: workflowsQueryKey(workspaceSlug),
        relatedQueryKeys: [['workflows', workspaceSlug]],
        getItemId: (workflow) => workflow.id,
      },
      singleItemQueryKey: workflowQueryKey(workspaceSlug, workflowID),
      onSuccess: (res) => {
        irminAlert('success', res.message ?? 'Workflow deleted successfully');
        // Invalidate workflow queries to ensure consistency
        void queryClient.invalidateQueries({
          queryKey: ['workflows', workspaceSlug],
        });
      },
      onError: (error) => {
        irminAlert(
          'error',
          error.message ?? dict.common.errors.mutations.deleteWorkflowFailed
        );
      },
    }),
  });

  const updateWorkflowMutation = useMutation<
    IrminAPIResponse<Workflow>,
    Error,
    UpdateWorkflowInput
  >({
    mutationFn: async (data) => {
      const core = await getCore();
      const response = await core.workflowService.updateWorkflow({
        workspace: workspaceSlug,
        workflowID,
        name: data.name,
        description: data.description,
        documentation: data.documentation,
      });
      return response;
    },
    ...updateMutationHandlers<Workflow, UpdateWorkflowInput>(queryClient, {
      cacheConfig: {
        primaryQueryKey: workflowsQueryKey(workspaceSlug),
        relatedQueryKeys: [['workflows', workspaceSlug]],
        getItemId: (workflow) => workflow.id,
      },
      singleItemQueryKey: workflowQueryKey(workspaceSlug, workflowID),
      onSuccess: (res) => {
        irminAlert('success', res.message ?? 'Workflow updated successfully');
        // Invalidate workflow queries to ensure consistency
        void queryClient.invalidateQueries({
          queryKey: ['workflows', workspaceSlug],
        });
      },
      onError: (error) => {
        irminAlert(
          'error',
          error.message ?? dict.common.errors.mutations.updateWorkflowFailed
        );
      },
    }),
  });

  const updateWorkflowScheduleMutation = useMutation<
    IrminAPIResponse<Workflow>,
    Error,
    WorkflowSchedule
  >({
    mutationFn: async (data) => {
      const core = await getCore();
      const response = await core.workflowService.updateWorkflowSchedule({
        workspace: workspaceSlug,
        workflowID,
        schedule: data,
      });
      return response;
    },
    onSuccess: (res: IrminAPIResponse<Workflow>) => {
      void queryClient.invalidateQueries({
        queryKey: workflowQueryKey(workspaceSlug, workflowID),
      });
      void queryClient.invalidateQueries({
        queryKey: workflowsQueryKey(workspaceSlug),
      });
      irminAlert(
        'success',
        res.message ?? 'Workflow schedule updated successfully'
      );
    },
    onError: (error) => {
      console.error(error);
      irminAlert(
        'error',
        error.message ??
          dict.common.errors.mutations.updateWorkflowScheduleFailed
      );
    },
  });

  const updateWorkflowableMutation = useMutation<
    IrminAPIResponse<Workflow>,
    Error,
    Workflowable
  >({
    mutationFn: async (data) => {
      const core = await getCore();
      const response = await core.workflowService.updateWorkflowWorkflowable({
        workspace: workspaceSlug,
        workflowID,
        workflowable: data,
      });
      return response;
    },
    onSuccess: (res: IrminAPIResponse<Workflow>) => {
      void queryClient.invalidateQueries({
        queryKey: workflowQueryKey(workspaceSlug, workflowID),
      });
      void queryClient.invalidateQueries({
        queryKey: workflowsQueryKey(workspaceSlug),
      });
      irminAlert('success', res.message ?? 'Workflowable updated successfully');
    },
    onError: (error) => {
      console.error(error);
      irminAlert(
        'error',
        error.message ?? dict.common.errors.mutations.updateWorkflowableFailed
      );
    },
  });

  const transferWorkflowMutation = useMutation<
    IrminAPIResponse<Workflow>,
    Error,
    string
  >({
    mutationFn: async (newOwnerID: string) => {
      const core = await getCore();
      const response = await core.workflowService.transferWorkflow({
        workspace: workspaceSlug,
        workflowID,
        newOwnerID,
      });
      return response;
    },
    onSuccess: (res: IrminAPIResponse<Workflow>) => {
      void queryClient.invalidateQueries({
        queryKey: workflowQueryKey(workspaceSlug, workflowID),
      });
      void queryClient.invalidateQueries({
        queryKey: workflowsQueryKey(workspaceSlug),
      });
      irminAlert('success', res.message ?? 'Workflow transfered successfully');
    },
    onError: (error) => {
      console.error(error);
      irminAlert(
        'error',
        error.message ?? dict.common.errors.mutations.transferWorkflowFailed
      );
    },
  });

  const pauseWorkflowMutation = useMutation<IrminAPIResponse<Workflow>, Error>({
    mutationFn: async () => {
      const core = await getCore();
      const response = await core.workflowService.pauseWorkflow({
        workspace: workspaceSlug,
        workflowID,
      });
      return response;
    },
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: workflowQueryKey(workspaceSlug, workflowID),
      });
      await queryClient.cancelQueries({
        queryKey: workflowsQueryKey(workspaceSlug),
      });

      // Snapshot the previous values
      const previousWorkflow = queryClient.getQueryData<
        IrminAPIResponse<Workflow>
      >(workflowQueryKey(workspaceSlug, workflowID));
      const previousWorkflows = queryClient.getQueryData<
        IrminAPIResponse<Workflow[]>
      >(workflowsQueryKey(workspaceSlug));

      // Optimistically update the single workflow cache with paused status
      queryClient.setQueryData<IrminAPIResponse<Workflow>>(
        workflowQueryKey(workspaceSlug, workflowID),
        (old: IrminAPIResponse<Workflow> | undefined) => {
          if (!old?.data) return old;

          return {
            ...old,
            data: {
              ...old.data,
              status: 'paused' as WorkflowStatus,
            },
          };
        }
      );

      // Optimistically update the workflows list cache
      queryClient.setQueryData<IrminAPIResponse<Workflow[]>>(
        workflowsQueryKey(workspaceSlug),
        (old: IrminAPIResponse<Workflow[]> | undefined) => {
          if (!old?.data) return old;

          const updatedWorkflows = old.data.map((workflow: Workflow) =>
            workflow.id === workflowID
              ? { ...workflow, status: 'paused' as WorkflowStatus }
              : workflow
          );

          return {
            ...old,
            data: updatedWorkflows,
          };
        }
      );

      // Return context for rollback
      return { previousWorkflow, previousWorkflows };
    },
    onError: (error, variables: void, context: unknown) => {
      // Rollback on error
      const ctx = context as
        | {
            previousWorkflow?: IrminAPIResponse<Workflow>;
            previousWorkflows?: IrminAPIResponse<Workflow[]>;
          }
        | undefined;
      if (ctx?.previousWorkflow) {
        queryClient.setQueryData(
          workflowQueryKey(workspaceSlug, workflowID),
          ctx.previousWorkflow
        );
      }
      if (ctx?.previousWorkflows) {
        queryClient.setQueryData(
          workflowsQueryKey(workspaceSlug),
          ctx.previousWorkflows
        );
      }
      console.error(error);
      irminAlert(
        'error',
        error.message ?? dict.common.errors.mutations.pauseWorkflowFailed
      );
    },
    onSuccess: (res: IrminAPIResponse<Workflow>) => {
      // Update with real data from server if available
      if (res.data) {
        queryClient.setQueryData<IrminAPIResponse<Workflow>>(
          workflowQueryKey(workspaceSlug, workflowID),
          res
        );
      }
      irminAlert('success', res.message ?? 'Workflow paused successfully');
    },
    onSettled: () => {
      // Invalidate all workflow queries with this workspace prefix to ensure filtered views are consistent
      void queryClient.invalidateQueries({
        queryKey: ['workflows', workspaceSlug],
      });
      void queryClient.invalidateQueries({
        queryKey: workflowQueryKey(workspaceSlug, workflowID),
      });
    },
  });

  const resumeWorkflowMutation = useMutation<IrminAPIResponse<Workflow>, Error>(
    {
      mutationFn: async () => {
        const core = await getCore();
        const response = await core.workflowService.startWorkflow({
          workspace: workspaceSlug,
          workflowID,
        });
        return response;
      },
      onMutate: async () => {
        // Cancel any outgoing refetches
        await queryClient.cancelQueries({
          queryKey: workflowQueryKey(workspaceSlug, workflowID),
        });
        await queryClient.cancelQueries({
          queryKey: workflowsQueryKey(workspaceSlug),
        });

        // Snapshot the previous values
        const previousWorkflow = queryClient.getQueryData<
          IrminAPIResponse<Workflow>
        >(workflowQueryKey(workspaceSlug, workflowID));
        const previousWorkflows = queryClient.getQueryData<
          IrminAPIResponse<Workflow[]>
        >(workflowsQueryKey(workspaceSlug));

        // Optimistically update the single workflow cache with running status
        queryClient.setQueryData<IrminAPIResponse<Workflow>>(
          workflowQueryKey(workspaceSlug, workflowID),
          (old: IrminAPIResponse<Workflow> | undefined) => {
            if (!old?.data) return old;

            return {
              ...old,
              data: {
                ...old.data,
                status: 'running' as WorkflowStatus,
              },
            };
          }
        );

        // Optimistically update the workflows list cache
        queryClient.setQueryData<IrminAPIResponse<Workflow[]>>(
          workflowsQueryKey(workspaceSlug),
          (old: IrminAPIResponse<Workflow[]> | undefined) => {
            if (!old?.data) return old;

            const updatedWorkflows = old.data.map((workflow: Workflow) =>
              workflow.id === workflowID
                ? { ...workflow, status: 'running' as WorkflowStatus }
                : workflow
            );

            return {
              ...old,
              data: updatedWorkflows,
            };
          }
        );

        // Return context for rollback
        return { previousWorkflow, previousWorkflows };
      },
      onError: (error, variables: void, context: unknown) => {
        // Rollback on error
        const ctx = context as
          | {
              previousWorkflow?: IrminAPIResponse<Workflow>;
              previousWorkflows?: IrminAPIResponse<Workflow[]>;
            }
          | undefined;
        if (ctx?.previousWorkflow) {
          queryClient.setQueryData(
            workflowQueryKey(workspaceSlug, workflowID),
            ctx.previousWorkflow
          );
        }
        if (ctx?.previousWorkflows) {
          queryClient.setQueryData(
            workflowsQueryKey(workspaceSlug),
            ctx.previousWorkflows
          );
        }
        console.error(error);
        irminAlert(
          'error',
          error.message ?? dict.common.errors.mutations.resumeWorkflowFailed
        );
      },
      onSuccess: (res: IrminAPIResponse<Workflow>) => {
        // Update with real data from server if available
        if (res.data) {
          queryClient.setQueryData<IrminAPIResponse<Workflow>>(
            workflowQueryKey(workspaceSlug, workflowID),
            res
          );
        }
        irminAlert('success', res.message ?? 'Workflow resumed successfully');
      },
      onSettled: () => {
        // Invalidate all workflow queries with this workspace prefix to ensure filtered views are consistent
        void queryClient.invalidateQueries({
          queryKey: ['workflows', workspaceSlug],
        });
        void queryClient.invalidateQueries({
          queryKey: workflowQueryKey(workspaceSlug, workflowID),
        });
      },
    }
  );

  return {
    // Queries
    workflowQuery,

    // Mutations
    deleteWorkflowMutation,
    updateWorkflowMutation,
    updateWorkflowScheduleMutation,
    updateWorkflowableMutation,
    transferWorkflowMutation,
    pauseWorkflowMutation,
    resumeWorkflowMutation,
  };
}
