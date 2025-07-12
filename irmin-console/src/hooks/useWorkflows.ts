import { useMutation, useQuery } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';

import IrminCore from '@/lib/core';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { generateTempId } from '@/utils/generateTempId';

import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import {
  Workflow,
  WorkflowableType,
  WorkflowStatus,
} from '@/types/core/Workflow';
import { WorkflowRequest } from '@/types/internal/WorkflowInput';

export const workflowsQueryKey = (
  workspaceSlug: string,
  type?: WorkflowableType
) => ['workflows', workspaceSlug, type];

export function useWorkflows(type?: WorkflowableType) {
  const { getToken } = useIAM();
  const { locale } = useLocale();
  const { irminAlert } = usePopup();
  const { workspaceSlug } = useWorkspaceContext();
  const queryClient = useQueryClient();

  const workflowsQuery = useQuery<IrminAPIResponse<Workflow[]>, Error>({
    queryKey: workflowsQueryKey(workspaceSlug, type),
    queryFn: async () => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      if (type) {
        return await core.workflowService.fetchWorkflowsOfType({
          workspace: workspaceSlug,
          workflowType: type,
        });
      }
      return await core.workflowService.fetchWorkflows({
        workspace: workspaceSlug,
      });
    },
  });

  const createWorkflowMutation = useMutation<
    IrminAPIResponse<Workflow>,
    Error,
    WorkflowRequest
  >({
    mutationFn: async (data) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.workflowService.createWorkflow({
        workspace: workspaceSlug,
        type: data.type,
        name: data.name,
        description: data.description,
        documentation: data.documentation,
        workflowable: data.workflowable,
        schedule: data.schedule,
      });
    },
    onMutate: async (data: WorkflowRequest) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: workflowsQueryKey(workspaceSlug),
      });
      await queryClient.cancelQueries({
        queryKey: workflowsQueryKey(workspaceSlug, type),
      });

      // Snapshot the previous values
      const previousWorkflows = queryClient.getQueryData<
        IrminAPIResponse<Workflow[]>
      >(workflowsQueryKey(workspaceSlug));
      const previousTypedWorkflows = queryClient.getQueryData<
        IrminAPIResponse<Workflow[]>
      >(workflowsQueryKey(workspaceSlug, type));

      // Create unique temp ID for this specific mutation
      const tempId = generateTempId('workflows');

      // Optimistically update the cache
      const optimisticWorkflow: Workflow = {
        id: tempId, // Unique temporary ID
        name: data.name,
        description: data.description,
        documentation: data.documentation,
        type: data.type,
        status: WorkflowStatus.Pending,
        owner: {
          id: 'temp-owner',
          first_name: 'Current',
          last_name: 'User',
          email: '',
          phone: '',
          company: '',
          profile_picture: '',
        },
        schedule: data.schedule,
        workflowable: data.workflowable,
      } as Workflow;

      // Update main workflows cache
      queryClient.setQueryData<IrminAPIResponse<Workflow[]>>(
        workflowsQueryKey(workspaceSlug),
        (old: IrminAPIResponse<Workflow[]> | undefined) => {
          if (!old?.data) return old;

          return {
            ...old,
            data: [...old.data, optimisticWorkflow],
          };
        }
      );

      // Update typed workflows cache if it matches the current type
      if (type && data.type === type) {
        queryClient.setQueryData<IrminAPIResponse<Workflow[]>>(
          workflowsQueryKey(workspaceSlug, type),
          (old: IrminAPIResponse<Workflow[]> | undefined) => {
            if (!old?.data) return old;

            return {
              ...old,
              data: [...old.data, optimisticWorkflow],
            };
          }
        );
      }

      // Return context for rollback
      return { previousWorkflows, previousTypedWorkflows, tempId };
    },
    onError: (error, data: WorkflowRequest, context: unknown) => {
      // Rollback on error
      const ctx = context as
        | {
            previousWorkflows?: IrminAPIResponse<Workflow[]>;
            previousTypedWorkflows?: IrminAPIResponse<Workflow[]>;
            tempId?: string;
          }
        | undefined;
      if (ctx?.previousWorkflows) {
        queryClient.setQueryData(
          workflowsQueryKey(workspaceSlug),
          ctx.previousWorkflows
        );
      }
      if (ctx?.previousTypedWorkflows) {
        queryClient.setQueryData(
          workflowsQueryKey(workspaceSlug, type),
          ctx.previousTypedWorkflows
        );
      }
      console.error(error);
      irminAlert('error', error.message ?? 'Error creating workflow');
    },
    onSuccess: (
      res: IrminAPIResponse<Workflow>,
      data: WorkflowRequest,
      context: unknown
    ) => {
      // Update the cache with the real data from the server
      const ctx = context as
        | {
            previousWorkflows?: IrminAPIResponse<Workflow[]>;
            previousTypedWorkflows?: IrminAPIResponse<Workflow[]>;
            tempId?: string;
          }
        | undefined;

      queryClient.setQueryData<IrminAPIResponse<Workflow[]>>(
        workflowsQueryKey(workspaceSlug),
        (old: IrminAPIResponse<Workflow[]> | undefined) => {
          if (!old?.data || !res.data || !ctx?.tempId) return old;

          // Replace the specific optimistic workflow with the real one using exact temp ID
          const updatedWorkflows = old.data.map((workflow: Workflow) =>
            workflow.id === ctx.tempId ? res.data! : workflow
          );

          return {
            ...old,
            data: updatedWorkflows,
          };
        }
      );

      // Update typed workflows cache if applicable
      if (type && data.type === type) {
        queryClient.setQueryData<IrminAPIResponse<Workflow[]>>(
          workflowsQueryKey(workspaceSlug, type),
          (old: IrminAPIResponse<Workflow[]> | undefined) => {
            if (!old?.data || !res.data || !ctx?.tempId) return old;

            // Replace the specific optimistic workflow with the real one using exact temp ID
            const updatedWorkflows = old.data.map((workflow: Workflow) =>
              workflow.id === ctx.tempId ? res.data! : workflow
            );

            return {
              ...old,
              data: updatedWorkflows,
            };
          }
        );
      }

      irminAlert('success', res.message ?? 'Workflow created successfully');
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({
        queryKey: workflowsQueryKey(workspaceSlug),
      });
      queryClient.invalidateQueries({
        queryKey: workflowsQueryKey(workspaceSlug, type),
      });
    },
  });

  return {
    // Queries
    workflowsQuery,

    // Mutations
    createWorkflowMutation,
  };
}
