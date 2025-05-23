import { useMutation, useQuery } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';

import IrminCore from '@/lib/core';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { Workflow, WorkflowableType } from '@/types/core/Workflow';
import { WorkflowInput } from '@/types/internal/WorkflowInput';

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
    IrminAPIResponse,
    Error,
    WorkflowInput
  >({
    mutationFn: async (data) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.workflowService.createWorkflow({
        workspace: workspaceSlug,
        name: data.name,
        description: data.description,
        documentation: data.documentation,
        workflowable: data.workflowable,
        schedule: data.schedule,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({
        queryKey: workflowsQueryKey(workspaceSlug),
      });
      queryClient.invalidateQueries({
        queryKey: workflowsQueryKey(workspaceSlug, type),
      });
      irminAlert('success', res.message ?? 'Workflow created successfully');
    },
    onError: (error) => {
      console.error(error);
      irminAlert('error', error.message ?? 'Error creating workflow');
    },
  });

  return {
    // Queries
    workflowsQuery,

    // Mutations
    createWorkflowMutation,
  };
}
