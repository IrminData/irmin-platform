import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import IrminCore from '@/lib/core';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { WorkflowSchedule } from '@/types/core/Schedule';
import { Workflow, Workflowable, WorkflowStatus } from '@/types/core/Workflow';

import { workflowsQueryKey } from './useWorkflows';

export const workflowQueryKey = (workspaceSlug: string, workflowID: string) => [
  'workflow',
  workspaceSlug,
  workflowID,
];

type UpdateWorkflowInput = {
  name: string;
  description: string;
  documentation: string;
};

export function useWorkflow(workflowID: string) {
  const { getToken } = useIAM();
  const { locale } = useLocale();
  const { irminAlert } = usePopup();
  const { workspaceSlug } = useWorkspaceContext();
  const queryClient = useQueryClient();
  const workflowQuery = useQuery<IrminAPIResponse<Workflow>, Error>({
    queryKey: workflowQueryKey(workspaceSlug, workflowID),
    queryFn: async () => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      const workflow = await core.workflowService.fetchWorkflow({
        workspace: workspaceSlug,
        workflowID,
      });
      return workflow;
    },
  });

  const deleteWorkflowMutation = useMutation<IrminAPIResponse, Error>({
    mutationFn: async () => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      const response = await core.workflowService.deleteWorkflow({
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

      // Optimistically remove from workflows list cache
      queryClient.setQueryData<IrminAPIResponse<Workflow[]>>(
        workflowsQueryKey(workspaceSlug),
        (old: IrminAPIResponse<Workflow[]> | undefined) => {
          if (!old?.data) return old;

          const filteredWorkflows = old.data.filter(
            (workflow: Workflow) => workflow.id !== workflowID
          );

          return {
            ...old,
            data: filteredWorkflows,
          };
        }
      );

      // Clear single workflow cache
      queryClient.removeQueries({
        queryKey: workflowQueryKey(workspaceSlug, workflowID),
      });

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
      irminAlert('error', error.message ?? 'Error deleting workflow');
    },
    onSuccess: (res: IrminAPIResponse) => {
      // The optimistic update is already done, just show success message
      irminAlert('success', res.message ?? 'Workflow deleted successfully');
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({
        queryKey: workflowQueryKey(workspaceSlug, workflowID),
      });
      queryClient.invalidateQueries({
        queryKey: workflowsQueryKey(workspaceSlug),
      });
    },
  });

  const updateWorkflowMutation = useMutation<
    IrminAPIResponse<Workflow>,
    Error,
    UpdateWorkflowInput
  >({
    mutationFn: async (data) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      const response = await core.workflowService.updateWorkflow({
        workspace: workspaceSlug,
        workflowID,
        name: data.name,
        description: data.description,
        documentation: data.documentation,
      });
      return response;
    },
    onMutate: async (data: UpdateWorkflowInput) => {
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

      // Optimistically update the single workflow cache
      queryClient.setQueryData<IrminAPIResponse<Workflow>>(
        workflowQueryKey(workspaceSlug, workflowID),
        (old: IrminAPIResponse<Workflow> | undefined) => {
          if (!old?.data) return old;

          return {
            ...old,
            data: {
              ...old.data,
              ...data,
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
            workflow.id === workflowID ? { ...workflow, ...data } : workflow
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
    onError: (error, data: UpdateWorkflowInput, context: unknown) => {
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
      irminAlert('error', error.message ?? 'Error updating workflow');
    },
    onSuccess: (
      res: IrminAPIResponse<Workflow>,
      _data: UpdateWorkflowInput
    ) => {
      // Update the cache with the real data from the server if available
      if (res.data) {
        queryClient.setQueryData<IrminAPIResponse<Workflow>>(
          workflowQueryKey(workspaceSlug, workflowID),
          res
        );

        // Update the workflows list
        queryClient.setQueryData<IrminAPIResponse<Workflow[]>>(
          workflowsQueryKey(workspaceSlug),
          (old: IrminAPIResponse<Workflow[]> | undefined) => {
            if (!old?.data) return old;

            const updatedWorkflows = old.data.map((workflow: Workflow) =>
              workflow.id === workflowID ? res.data! : workflow
            );

            return {
              ...old,
              data: updatedWorkflows,
            };
          }
        );
      }

      irminAlert('success', res.message ?? 'Workflow updated successfully');
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({
        queryKey: workflowQueryKey(workspaceSlug, workflowID),
      });
      queryClient.invalidateQueries({
        queryKey: workflowsQueryKey(workspaceSlug),
      });
    },
  });

  const updateWorkflowScheduleMutation = useMutation<
    IrminAPIResponse<Workflow>,
    Error,
    WorkflowSchedule
  >({
    mutationFn: async (data) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      const response = await core.workflowService.updateWorkflowSchedule({
        workspace: workspaceSlug,
        workflowID,
        schedule: data,
      });
      return response;
    },
    onSuccess: (res: IrminAPIResponse<Workflow>) => {
      queryClient.invalidateQueries({
        queryKey: workflowQueryKey(workspaceSlug, workflowID),
      });
      queryClient.invalidateQueries({
        queryKey: workflowsQueryKey(workspaceSlug),
      });
      irminAlert(
        'success',
        res.message ?? 'Workflow schedule updated successfully'
      );
    },
    onError: (error) => {
      console.error(error);
      irminAlert('error', error.message ?? 'Error updating workflow schedule');
    },
  });

  const updateWorkflowableMutation = useMutation<
    IrminAPIResponse<Workflow>,
    Error,
    Workflowable
  >({
    mutationFn: async (data) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      const response = await core.workflowService.updateWorkflowWorkflowable({
        workspace: workspaceSlug,
        workflowID,
        workflowable: data,
      });
      return response;
    },
    onSuccess: (res: IrminAPIResponse<Workflow>) => {
      queryClient.invalidateQueries({
        queryKey: workflowQueryKey(workspaceSlug, workflowID),
      });
      queryClient.invalidateQueries({
        queryKey: workflowsQueryKey(workspaceSlug),
      });
      irminAlert('success', res.message ?? 'Workflowable updated successfully');
    },
    onError: (error) => {
      console.error(error);
      irminAlert('error', error.message ?? 'Error updating workflowable');
    },
  });

  const transferWorkflowMutation = useMutation<
    IrminAPIResponse<Workflow>,
    Error,
    string
  >({
    mutationFn: async (newOwnerID: string) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      const response = await core.workflowService.transferWorkflow({
        workspace: workspaceSlug,
        workflowID,
        newOwnerID,
      });
      return response;
    },
    onSuccess: (res: IrminAPIResponse<Workflow>) => {
      queryClient.invalidateQueries({
        queryKey: workflowQueryKey(workspaceSlug, workflowID),
      });
      queryClient.invalidateQueries({
        queryKey: workflowsQueryKey(workspaceSlug),
      });
      irminAlert('success', res.message ?? 'Workflow transfered successfully');
    },
    onError: (error) => {
      console.error(error);
      irminAlert('error', error.message ?? 'Error transfering workflow');
    },
  });

  const pauseWorkflowMutation = useMutation<IrminAPIResponse<Workflow>, Error>({
    mutationFn: async () => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
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
              status: WorkflowStatus.Paused, // Paused status
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
              ? { ...workflow, status: WorkflowStatus.Paused }
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
      irminAlert('error', error.message ?? 'Error pausing workflow');
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
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({
        queryKey: workflowQueryKey(workspaceSlug, workflowID),
      });
      queryClient.invalidateQueries({
        queryKey: workflowsQueryKey(workspaceSlug),
      });
    },
  });

  const resumeWorkflowMutation = useMutation<IrminAPIResponse<Workflow>, Error>(
    {
      mutationFn: async () => {
        const token = await getToken();
        const core = new IrminCore(locale, token);
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
                status: WorkflowStatus.Running, // Running status
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
                ? { ...workflow, status: WorkflowStatus.Running }
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
        irminAlert('error', error.message ?? 'Error resuming workflow');
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
        // Always refetch after error or success to ensure consistency
        queryClient.invalidateQueries({
          queryKey: workflowQueryKey(workspaceSlug, workflowID),
        });
        queryClient.invalidateQueries({
          queryKey: workflowsQueryKey(workspaceSlug),
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
