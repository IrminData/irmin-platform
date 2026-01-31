import { useMutation, useQuery } from '@tanstack/react-query';

import { repositoryObjectQueryKey } from '@/lib/queryKeys';

import { useIrminCore } from '@/context/IrminCoreContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { ObjectSchema } from '@/types/core/ObjectSchema';

import { useInvalidateObjectQueries } from './useInvalidateObjectQueries';

export const useRepositoryObject = (
  repositorySlug: string,
  ref?: string,
  path?: string
) => {
  const { getCore } = useIrminCore();
  const { dict } = useLocale();
  const { workspaceSlug } = useWorkspaceContext();
  const { irminAlert } = usePopup();

  const { invalidateObjectQueries } = useInvalidateObjectQueries(
    workspaceSlug,
    repositorySlug
  );

  const repositoryObjectQuery = useQuery({
    queryKey: repositoryObjectQueryKey(
      workspaceSlug,
      repositorySlug,
      ref ?? '',
      path ?? ''
    ),
    queryFn: async () => {
      const core = await getCore();
      return core.objectService.getObjectAtPath({
        workspace: workspaceSlug,
        repository: repositorySlug,
        path: path ?? '/',
        ref: ref,
      });
    },
    enabled: !!workspaceSlug && !!repositorySlug && !!ref,
  });

  const deleteObjectMutation = useMutation<
    IrminAPIResponse,
    Error,
    { path: string; ref: string }
  >({
    mutationFn: async ({ path, ref }: { path: string; ref: string }) => {
      const core = await getCore();
      return core.objectService.deleteObject({
        workspace: workspaceSlug,
        repository: repositorySlug,
        path,
        ref,
      });
    },
    onSuccess: (res, { path, ref }) => {
      invalidateObjectQueries(path, ref);
      irminAlert('success', res.message ?? 'Object deleted successfully');
    },
    onError: (error) => {
      irminAlert('error', error.message ?? 'Failed to delete object');
    },
  });

  const moveObjectMutation = useMutation<
    IrminAPIResponse,
    Error,
    { oldPath: string; newPath: string; ref: string }
  >({
    mutationFn: async ({ oldPath, newPath, ref }) => {
      const core = await getCore();
      return core.objectService.moveObject({
        workspace: workspaceSlug,
        repository: repositorySlug,
        path: oldPath,
        newPath,
        ref,
      });
    },
    onSuccess: (res, { oldPath, newPath, ref }) => {
      // Invalidate queries for both the old and new paths
      invalidateObjectQueries(oldPath, ref);
      invalidateObjectQueries(newPath, ref);
      irminAlert('success', res.message ?? 'Object moved successfully');
    },
    onError: (error) => {
      irminAlert('error', error.message ?? 'Failed to move object');
    },
  });

  const copyObjectMutation = useMutation<
    IrminAPIResponse,
    Error,
    { oldPath: string; newPath: string; ref: string }
  >({
    mutationFn: async ({ oldPath, newPath, ref }) => {
      const core = await getCore();
      return core.objectService.copyObject({
        workspace: workspaceSlug,
        repository: repositorySlug,
        path: oldPath,
        newPath,
        ref,
      });
    },
    onSuccess: (res, { oldPath, newPath, ref }) => {
      // Invalidate queries for both the old and new paths
      invalidateObjectQueries(oldPath, ref);
      invalidateObjectQueries(newPath, ref);
      irminAlert('success', res.message ?? 'Object copied successfully');
    },
    onError: (error) => {
      irminAlert('error', error.message ?? 'Failed to copy object');
    },
  });

  const uploadObjectMutation = useMutation<
    IrminAPIResponse,
    Error,
    { path: string; ref: string; files: FileList; tags?: string[] }
  >({
    mutationFn: async ({ path, ref, files, tags }) => {
      const core = await getCore();
      return core.objectService.uploadObject({
        workspace: workspaceSlug,
        repository: repositorySlug,
        path,
        ref,
        files,
        tags,
      });
    },
    onSuccess: (res, { path, ref }) => {
      invalidateObjectQueries(path, ref);
      irminAlert('success', res.message ?? 'Object uploaded successfully');
    },
    onError: (error) => {
      irminAlert('error', error.message ?? 'Failed to upload object');
    },
  });

  const uploadObjectFromURLMutation = useMutation<
    IrminAPIResponse,
    Error,
    {
      path: string;
      ref: string;
      fileURL: string;
      headers?: { [key: string]: string };
      tags?: string[];
    }
  >({
    mutationFn: async ({ path, ref, fileURL, headers, tags }) => {
      const core = await getCore();
      return core.objectService.uploadObjectFromURL({
        workspace: workspaceSlug,
        repository: repositorySlug,
        path,
        ref,
        fileURL,
        headers,
        tags,
      });
    },
    onSuccess: (res, { path, ref }) => {
      invalidateObjectQueries(path, ref);
      irminAlert('success', res.message ?? 'Object uploaded successfully');
    },
    onError: (error) => {
      irminAlert('error', error.message ?? 'Failed to upload object');
    },
  });

  const createPointerMutation = useMutation<
    IrminAPIResponse,
    Error,
    {
      pointerPath: string;
      ref: string;
      targetRepository: string;
      targetPath: string;
      targetRef: string;
    }
  >({
    mutationFn: async ({
      pointerPath,
      ref,
      targetRepository,
      targetPath,
      targetRef,
    }) => {
      const core = await getCore();
      return core.objectService.createPointer({
        workspace: workspaceSlug,
        repository: repositorySlug,
        path: pointerPath,
        ref,
        targetRepository,
        targetPath,
        targetRef,
      });
    },
    onSuccess: (res, { pointerPath, ref }) => {
      invalidateObjectQueries(pointerPath, ref);
      irminAlert('success', res.message ?? 'Pointer created successfully');
    },
    onError: (error) => {
      irminAlert('error', error.message ?? 'Failed to create pointer');
    },
  });

  const validateObjectMutation = useMutation<
    {
      valid: boolean;
      logs: string[];
      error?: string;
    },
    Error,
    {
      path: string;
      ref: string;
      validationSchema: ObjectSchema;
      validationMode?: 'strict' | 'permissive';
    }
  >({
    mutationFn: async ({ path, ref, validationSchema, validationMode }) => {
      const core = await getCore();
      return core.objectService.validateObject({
        workspace: workspaceSlug,
        repository: repositorySlug,
        path,
        ref,
        validationSchema,
        validationMode: validationMode ?? 'strict',
      });
    },
    onSuccess: (res) => {
      if (res.valid) {
        irminAlert('success', dict.repository.objects.validationSuccessMessage);
      } else {
        irminAlert(
          'error',
          res.error ?? dict.repository.objects.validationFailedMessage
        );
      }
    },
    onError: (error) => {
      irminAlert(
        'error',
        error.message ?? dict.repository.objects.validationErrorMessage
      );
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
    uploadObjectFromURLMutation,
    createPointerMutation,
    validateObjectMutation,
  };
};
