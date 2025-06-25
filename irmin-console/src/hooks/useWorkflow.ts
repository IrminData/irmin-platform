import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import IrminCore from '@/lib/core';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { WorkflowSchedule } from '@/types/core/Schedule';
import { Workflow, Workflowable } from '@/types/core/Workflow';

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
    onSuccess: (res) => {
      queryClient.invalidateQueries({
        queryKey: workflowQueryKey(workspaceSlug, workflowID),
      });
      queryClient.invalidateQueries({
        queryKey: workflowsQueryKey(workspaceSlug),
      });
      irminAlert('success', res.message ?? 'Workflow deleted successfully');
    },
    onError: (error) => {
      console.error(error);
      irminAlert('error', error.message ?? 'Error deleting workflow');
    },
  });

  const updateWorkflowMutation = useMutation<
    IrminAPIResponse,
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
    onSuccess: (res) => {
      queryClient.invalidateQueries({
        queryKey: workflowQueryKey(workspaceSlug, workflowID),
      });
      queryClient.invalidateQueries({
        queryKey: workflowsQueryKey(workspaceSlug),
      });
      irminAlert('success', res.message ?? 'Workflow updated successfully');
    },
    onError: (error) => {
      console.error(error);
      irminAlert('error', error.message ?? 'Error updating workflow');
    },
  });

  const updateWorkflowScheduleMutation = useMutation<
    IrminAPIResponse,
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
    onSuccess: (res) => {
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
    IrminAPIResponse,
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
    onSuccess: (res) => {
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

  const transferWorkflowMutation = useMutation<IrminAPIResponse, Error, string>(
    {
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
      onSuccess: (res) => {
        queryClient.invalidateQueries({
          queryKey: workflowQueryKey(workspaceSlug, workflowID),
        });
        queryClient.invalidateQueries({
          queryKey: workflowsQueryKey(workspaceSlug),
        });
        irminAlert(
          'success',
          res.message ?? 'Workflow transfered successfully'
        );
      },
      onError: (error) => {
        console.error(error);
        irminAlert('error', error.message ?? 'Error transfering workflow');
      },
    }
  );

  const pauseWorkflowMutation = useMutation<IrminAPIResponse, Error>({
    mutationFn: async () => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      const response = await core.workflowService.pauseWorkflow({
        workspace: workspaceSlug,
        workflowID,
      });
      return response;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({
        queryKey: workflowQueryKey(workspaceSlug, workflowID),
      });
      queryClient.invalidateQueries({
        queryKey: workflowsQueryKey(workspaceSlug),
      });
      irminAlert('success', res.message ?? 'Workflow paused successfully');
    },
    onError: (error) => {
      console.error(error);
      irminAlert('error', error.message ?? 'Error pausing workflow');
    },
  });

  const resumeWorkflowMutation = useMutation<IrminAPIResponse, Error>({
    mutationFn: async () => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      const response = await core.workflowService.startWorkflow({
        workspace: workspaceSlug,
        workflowID,
      });
      return response;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({
        queryKey: workflowQueryKey(workspaceSlug, workflowID),
      });
      queryClient.invalidateQueries({
        queryKey: workflowsQueryKey(workspaceSlug),
      });
      irminAlert('success', res.message ?? 'Workflow resumed successfully');
    },
    onError: (error) => {
      console.error(error);
      irminAlert('error', error.message ?? 'Error resuming workflow');
    },
  });

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
