import { useMutation, useQuery } from '@tanstack/react-query';

import IrminCore from '@/lib/core';
import { repositoryObjectQueryKey } from '@/lib/queryKeys';

import { useIAM } from '@/context/IAMContext';
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
  const { getToken } = useIAM();
  const { locale, dict } = useLocale();
  const { workspaceSlug } = useWorkspaceContext();
  const { irminAlert } = usePopup();

  const { invalidateObjectQueries } =
    useInvalidateObjectQueries(repositorySlug);

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
      const token = await getToken();
      const irminCore = new IrminCore(locale, token);
      return irminCore.objectService.uploadObject({
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
      const token = await getToken();
      const irminCore = new IrminCore(locale, token);
      return irminCore.objectService.uploadObjectFromURL({
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
      const token = await getToken();
      const irminCore = new IrminCore(locale, token);
      return irminCore.objectService.validateObject({
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
    validateObjectMutation,
  };
};
