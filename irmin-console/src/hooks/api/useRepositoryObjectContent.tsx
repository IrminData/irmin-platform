import { useMutation, useQuery } from '@tanstack/react-query';

import IrminCore from '@/lib/core';
import { repositoryObjectContentQueryKey } from '@/lib/queryKeys';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { downloadFile } from '@/utils/downloadFile';

import type { IrminAPIBinaryResponse } from '@/types/core/IrminAPIResponse';

export const useRepositoryObjectContent = (
  repositorySlug: string,
  ref?: string,
  path?: string
) => {
  const { getToken } = useIAM();
  const { locale } = useLocale();
  const { workspaceSlug } = useWorkspaceContext();
  const { irminAlert } = usePopup();
  const { dict } = useLocale();

  const repositoryObjectContentQuery = useQuery({
    queryKey: repositoryObjectContentQueryKey(
      workspaceSlug,
      repositorySlug,
      ref ?? '',
      path ?? ''
    ),
    queryFn: async () => {
      const token = await getToken();
      const irminCore = new IrminCore(locale, token);
      return irminCore.objectService.getObjectContent({
        workspace: workspaceSlug,
        repository: repositorySlug,
        path: path ?? '',
        ref: ref ?? '',
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
      const token = await getToken();
      const irminCore = new IrminCore(locale, token);
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
