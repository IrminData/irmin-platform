import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import IrminCore from '@/lib/core';
import { workflowsQueryKey } from '@/lib/queryKeys';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { Workflow, WorkflowableType } from '@/types/core/Workflow';
import type { WorkflowRequest } from '@/types/internal/WorkflowInput';

import { createMutationHandlers } from './mutations/utils';

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
        tags: data.tags,
      });
    },
    ...createMutationHandlers<Workflow, WorkflowRequest>(
      queryClient,
      'workflows',
      {
        cacheConfig: {
          primaryQueryKey: workflowsQueryKey(workspaceSlug),
          relatedQueryKeys: type
            ? [
                workflowsQueryKey(workspaceSlug, type),
                ['workflows', workspaceSlug],
              ]
            : [['workflows', workspaceSlug]],
          getItemId: (workflow) => workflow.id,
          createOptimisticItem: (input: WorkflowRequest, tempId: string) =>
            ({
              id: tempId,
              name: input.name,
              description: input.description,
              documentation: input.documentation,
              type: input.type,
              status: 'pending',
              owner: {
                id: 'temp-owner',
                first_name: 'Current',
                last_name: 'User',
                email: '',
                phone: '',
                company: '',
                profile_picture: '',
              },
              tags: [],
              schedule: input.schedule,
              workflowable: input.workflowable,
            }) as Workflow,
        },
        onSuccess: (res, input) => {
          irminAlert('success', res.message ?? 'Workflow created successfully');
          // Update typed workflows cache if applicable
          if (type && input.type === type && res.data) {
            queryClient.setQueryData<IrminAPIResponse<Workflow[]>>(
              workflowsQueryKey(workspaceSlug, type),
              (old: IrminAPIResponse<Workflow[]> | undefined) => {
                if (!old?.data) return old;
                return {
                  ...old,
                  data: [...old.data, res.data!],
                };
              }
            );
          }
          // Invalidate all workflow queries to ensure consistency
          queryClient.invalidateQueries({
            queryKey: ['workflows', workspaceSlug],
          });
        },
        onError: (error) => {
          irminAlert('error', error.message ?? 'Error creating workflow');
        },
      }
    ),
  });

  return {
    // Queries
    workflowsQuery,

    // Mutations
    createWorkflowMutation,
  };
}
