import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import IrminCore from '@/lib/core';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

export const repositoryObjectQueryKey = (
  workspaceSlug: string,
  repositorySlug: string,
  ref: string,
  path: string
) => ['repository-object', workspaceSlug, repositorySlug, ref, path] as const;

export const useRepositoryObject = (
  repositorySlug: string,
  ref?: string,
  path?: string
) => {
  const { getToken } = useIAM();
  const { locale } = useLocale();
  const { workspaceSlug } = useWorkspaceContext();
  const queryClient = useQueryClient();
  const { irminAlert } = usePopup();
  const repositoryObjectQuery = useQuery({
    queryKey: repositoryObjectQueryKey(
      workspaceSlug,
      repositorySlug,
      ref ?? '',
      path ?? ''
    ),
    queryFn: async () => {
      const token = await getToken();
      const irminCore = new IrminCore(locale, token);
      return irminCore.objectService.getObjectAtPath({
        workspace: workspaceSlug,
        repository: repositorySlug,
        path: path ?? '/',
        ref: ref,
      });
    },
  });

  const deleteObjectMutation = useMutation<
    IrminAPIResponse,
    Error,
    { path: string; ref: string }
  >({
    mutationFn: async ({ path, ref }: { path: string; ref: string }) => {
      const token = await getToken();
      const irminCore = new IrminCore(locale, token);
      return irminCore.objectService.deleteObject({
        workspace: workspaceSlug,
        repository: repositorySlug,
        path,
        ref,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({
        queryKey: [
          'repository-object',
          workspaceSlug,
          repositorySlug,
          ref,
          path,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: [
          'repository-object-content',
          workspaceSlug,
          repositorySlug,
          ref,
          path,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: [
          'repository-object-schema',
          workspaceSlug,
          repositorySlug,
          ref,
          path,
        ],
      });
      irminAlert('success', res.message ?? 'Object deleted successfully');
    },
    onError: (error) => {
      console.error(error);
      irminAlert('error', error.message ?? 'Failed to delete object');
    },
  });

  const moveObjectMutation = useMutation<
    IrminAPIResponse,
    Error,
    { oldPath: string; newPath: string; ref: string }
  >({
    mutationFn: async ({
      oldPath,
      newPath,
      ref,
    }: {
      oldPath: string;
      newPath: string;
      ref: string;
    }) => {
      const token = await getToken();
      const irminCore = new IrminCore(locale, token);
      return irminCore.objectService.moveObject({
        workspace: workspaceSlug,
        repository: repositorySlug,
        path: oldPath,
        newPath,
        ref,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({
        queryKey: ['repository-object', workspaceSlug, repositorySlug, ref],
      });
      queryClient.invalidateQueries({
        queryKey: [
          'repository-object-content',
          workspaceSlug,
          repositorySlug,
          ref,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: [
          'repository-object-schema',
          workspaceSlug,
          repositorySlug,
          ref,
        ],
      });
      irminAlert('success', res.message ?? 'Object moved successfully');
    },
    onError: (error) => {
      console.error(error);
      irminAlert('error', error.message ?? 'Failed to move object');
    },
  });

  const copyObjectMutation = useMutation<
    IrminAPIResponse,
    Error,
    { oldPath: string; newPath: string; ref: string }
  >({
    mutationFn: async ({
      oldPath,
      newPath,
      ref,
    }: {
      oldPath: string;
      newPath: string;
      ref: string;
    }) => {
      const token = await getToken();
      const irminCore = new IrminCore(locale, token);
      return irminCore.objectService.copyObject({
        workspace: workspaceSlug,
        repository: repositorySlug,
        path: oldPath,
        newPath,
        ref,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({
        queryKey: ['repository-object', workspaceSlug, repositorySlug, ref],
      });
      queryClient.invalidateQueries({
        queryKey: [
          'repository-object-content',
          workspaceSlug,
          repositorySlug,
          ref,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: [
          'repository-object-schema',
          workspaceSlug,
          repositorySlug,
          ref,
        ],
      });
      irminAlert('success', res.message ?? 'Object copied successfully');
    },
    onError: (error) => {
      console.error(error);
      irminAlert('error', error.message ?? 'Failed to copy object');
    },
  });

  const uploadObjectMutation = useMutation<
    IrminAPIResponse,
    Error,
    { path: string; ref: string; files: FileList }
  >({
    mutationFn: async ({
      path,
      ref,
      files,
    }: {
      path: string;
      ref: string;
      files: FileList;
    }) => {
      const token = await getToken();
      const irminCore = new IrminCore(locale, token);
      return irminCore.objectService.uploadObject({
        workspace: workspaceSlug,
        repository: repositorySlug,
        path,
        ref,
        files,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({
        queryKey: ['repository-object', workspaceSlug, repositorySlug, ref],
      });
      queryClient.invalidateQueries({
        queryKey: [
          'repository-object-content',
          workspaceSlug,
          repositorySlug,
          ref,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: [
          'repository-object-schema',
          workspaceSlug,
          repositorySlug,
          ref,
        ],
      });
      irminAlert('success', res.message ?? 'Object uploaded successfully');
    },
    onError: (error) => {
      console.error(error);
      irminAlert('error', error.message ?? 'Failed to upload object');
    },
  });

  return {
    // Queries
    repositoryObjectQuery,

    // Mutations
    deleteObjectMutation,
    moveObjectMutation,
    copyObjectMutation,
    uploadObjectMutation,
  };
};
