import { useMutation, useQuery } from '@tanstack/react-query';

import { repositoryObjectContentQueryKey } from '@/lib/queryKeys';

import { useIrminCore } from '@/context/IrminCoreContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { downloadFile } from '@/utils/downloadFile';

import type { IrminAPIBinaryResponse } from '@/types/core/IrminAPIResponse';

export const useRepositoryObjectContent = (
  repositorySlug: string,
  ref?: string,
  path?: string,
  limitResponse?: boolean
) => {
  const { getCore } = useIrminCore();
  const { workspaceSlug } = useWorkspaceContext();
  const { irminAlert } = usePopup();
  const { dict } = useLocale();

  const repositoryObjectContentQuery = useQuery({
    queryKey: repositoryObjectContentQueryKey(
      workspaceSlug,
      repositorySlug,
      ref ?? '',
      path ?? '',
      limitResponse
    ),
    queryFn: async () => {
      const irminCore = await getCore();
      return irminCore.objectService.getObjectContent({
        workspace: workspaceSlug,
        repository: repositorySlug,
        path: path ?? '',
        ref: ref ?? '',
        limitResponse,
      });
    },
    enabled: !!ref && !!path,
  });

  const downloadObjectAsZipMutation = useMutation<
    IrminAPIBinaryResponse,
    Error,
    {
      path: string;
      ref: string;
    }
  >({
    mutationFn: async (data) => {
      const irminCore = await getCore();
      return irminCore.objectService.downloadObjectZip({
        workspace: workspaceSlug,
        repository: repositorySlug,
        path: data.path,
        ref: data.ref,
      });
    },
    onSuccess: (res) => {
      if (typeof res == 'string' || res instanceof Blob) {
        // Construct the name of the file
        const objectName = path?.split('/').pop() ?? 'root';
        const zipName = `${workspaceSlug}-${repositorySlug}-${ref}-${objectName}.zip`;
        // Download the file
        downloadFile(res, zipName, 'application/zip');
        // Alert the user
        irminAlert('success', dict.common.downloadSuccess);
      } else {
        irminAlert('error', dict.common.errors.mutations.downloadObjectFailed);
      }
    },
    onError: (error) => {
      irminAlert(
        'error',
        error.message ?? dict.common.errors.mutations.downloadObjectFailed
      );
    },
  });

  // Raw-file download: triggered when the inline-preview fetch 413s
  // because the file exceeds MAX_IN_MEMORY_SIZE_MB on the server. Routes
  // through ObjectService.downloadObjectRaw, which uses fetchRawBlob
  // and therefore never parses the response body — critical for JSON
  // files like stripe-customers.json where fetchBinary would otherwise
  // return a parsed array and break the download path. The server's
  // size-tiered download (in-memory / stream / presigned redirect)
  // handles arbitrarily large files.
  const downloadObjectRawMutation = useMutation<
    Blob,
    Error,
    { path: string; ref: string; contentType?: string }
  >({
    mutationFn: async (data) => {
      const irminCore = await getCore();
      return irminCore.objectService.downloadObjectRaw({
        workspace: workspaceSlug,
        repository: repositorySlug,
        path: data.path,
        ref: data.ref,
      });
    },
    onSuccess: (blob, vars) => {
      const filename = vars.path.split('/').pop() ?? 'download';
      const mimeType =
        vars.contentType || blob.type || 'application/octet-stream';
      downloadFile(blob, filename, mimeType);
      irminAlert('success', dict.common.downloadSuccess);
    },
    onError: (error) => {
      irminAlert(
        'error',
        error.message ?? dict.common.errors.mutations.downloadObjectFailed
      );
    },
  });

  return {
    // Queries
    repositoryObjectContentQuery,

    // Mutations
    downloadObjectAsZipMutation,
    downloadObjectRawMutation,
  };
};
