import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import IrminCore from '@/lib/core';
import { scriptsQueryKey } from '@/lib/queryKeys';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { ScriptResult, StoredScript } from '@/types/core/Script';
import type { ActionInputData } from '@/types/core/Workflow';

import {
  createMutationHandlers,
  deleteMutationHandlers,
} from './mutations/utils';

type ScriptCreateInput = {
  name: string;
  description?: string;
  content?: string;
  language?: string;
  tags?: string[];
};

type ScriptUpdateInput = {
  scriptId: string;
  name?: string;
  description?: string;
  content?: string;
  language?: string;
};

type ScriptExecuteInput = {
  scriptId: string;
  inputs?: ActionInputData[];
};

type ScriptTransferInput = {
  scriptId: string;
  newOwnerId: string;
};

export function useScripts() {
  const { getToken } = useIAM();
  const { locale } = useLocale();
  const { irminAlert } = usePopup();
  const { workspaceSlug } = useWorkspaceContext();
  const queryClient = useQueryClient();

  const scriptsQuery = useQuery<IrminAPIResponse<StoredScript[]>, Error>({
    queryKey: scriptsQueryKey(workspaceSlug),
    queryFn: async () => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.scriptsService.listScripts({
        workspace: workspaceSlug,
      });
    },
  });

  const createScriptMutation = useMutation<
    IrminAPIResponse<StoredScript>,
    Error,
    ScriptCreateInput
  >({
    mutationFn: async (data) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.scriptsService.createScript({
        workspace: workspaceSlug,
        name: data.name,
        description: data.description,
        content: data.content,
        language: data.language,
        tags: data.tags,
      });
    },
    ...createMutationHandlers<StoredScript, ScriptCreateInput>(
      queryClient,
      'scripts',
      {
        cacheConfig: {
          primaryQueryKey: scriptsQueryKey(workspaceSlug),
          relatedQueryKeys: [['scripts', workspaceSlug]],
          getItemId: (script) => script.id,
          createOptimisticItem: (input: ScriptCreateInput, tempId: string) => ({
            id: tempId,
            name: input.name,
            content: input.content,
            language: input.language,
            owner: {
              id: 'temp',
              first_name: 'Loading',
              last_name: 'User',
              email: '',
              phone: '',
              company: '',
              profile_picture: '',
            },
            tags: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        },
        onSuccess: (res) => {
          irminAlert('success', res.message ?? 'Script created successfully');
        },
        onError: (error) => {
          irminAlert('error', error.message ?? 'Error creating script');
        },
      }
    ),
  });

  const updateScriptMutation = useMutation<
    IrminAPIResponse<StoredScript>,
    Error,
    ScriptUpdateInput
  >({
    mutationFn: async (data) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.scriptsService.updateScript({
        workspace: workspaceSlug,
        scriptId: data.scriptId,
        name: data.name,
        description: data.description,
        content: data.content,
        language: data.language,
      });
    },
    onSuccess: (res, data) => {
      void queryClient.invalidateQueries({
        queryKey: scriptsQueryKey(workspaceSlug, data.scriptId),
      });
      void queryClient.invalidateQueries({
        queryKey: scriptsQueryKey(workspaceSlug),
      });
      irminAlert('success', res.message ?? 'Script updated successfully');
    },
    onError: (error) => {
      irminAlert('error', error.message ?? 'Error updating script');
    },
  });

  const deleteScriptMutation = useMutation<IrminAPIResponse, Error, string>({
    mutationFn: async (scriptId: string) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.scriptsService.deleteScript({
        workspace: workspaceSlug,
        scriptId: scriptId,
      });
    },
    ...deleteMutationHandlers<StoredScript>(queryClient, {
      cacheConfig: {
        primaryQueryKey: scriptsQueryKey(workspaceSlug),
        relatedQueryKeys: [['scripts', workspaceSlug]],
        getItemId: (script) => script.id,
      },
      onSuccess: (res) => {
        irminAlert('success', res.message ?? 'Script deleted successfully');
      },
      onError: (error) => {
        irminAlert('error', error.message ?? 'Error deleting script');
      },
    }),
  });

  const executeScriptMutation = useMutation<
    IrminAPIResponse<ScriptResult>,
    Error,
    ScriptExecuteInput
  >({
    mutationFn: async (data) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.scriptsService.executeScript({
        workspace: workspaceSlug,
        scriptId: data.scriptId,
        inputs: data.inputs ?? [],
      });
    },
    onSuccess: (res) => {
      irminAlert('info', res.message ?? 'Script executed successfully');
    },
    onError: (error) => {
      irminAlert('error', error.message ?? 'Error executing script');
    },
  });

  const transferScriptMutation = useMutation<
    IrminAPIResponse<StoredScript>,
    Error,
    ScriptTransferInput
  >({
    mutationFn: async (data) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.scriptsService.transferScript({
        workspace: workspaceSlug,
        scriptId: data.scriptId,
        newOwnerId: data.newOwnerId,
      });
    },
    onSuccess: (res, data) => {
      void queryClient.invalidateQueries({
        queryKey: scriptsQueryKey(workspaceSlug, data.scriptId),
      });
      void queryClient.invalidateQueries({
        queryKey: scriptsQueryKey(workspaceSlug),
      });
      irminAlert(
        'success',
        res.message ?? 'Script ownership transferred successfully'
      );
    },
    onError: (error) => {
      irminAlert(
        'error',
        error.message ?? 'Error transferring script ownership'
      );
    },
  });

  return {
    // Queries
    scriptsQuery,

    // Mutations
    createScriptMutation,
    updateScriptMutation,
    deleteScriptMutation,
    executeScriptMutation,
    transferScriptMutation,
  };
}

/**
 * Hook to get a specific script by ID
 */
export function useScript(scriptId?: string) {
  const { getToken } = useIAM();
  const { locale } = useLocale();
  const { workspaceSlug } = useWorkspaceContext();

  const scriptQuery = useQuery<IrminAPIResponse<StoredScript>, Error>({
    queryKey: scriptsQueryKey(workspaceSlug, scriptId ?? ''),
    queryFn: async () => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.scriptsService.getScript({
        workspace: workspaceSlug,
        scriptId: scriptId!,
      });
    },
    enabled: !!scriptId,
  });

  return { scriptQuery };
}
