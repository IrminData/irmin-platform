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
        irminAlert('error', dict.common.somethingWentWrong);
      }
    },
    onError: (error) => {
      irminAlert('error', error.message ?? 'Failed to download object');
    },
  });

  return {
    // Queries
    repositoryObjectContentQuery,

    // Mutations
    downloadObjectAsZipMutation,
  };
};
