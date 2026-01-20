import { useMutation } from '@tanstack/react-query';

import IrminCore from '@/lib/core';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type {
  SchemaDiff,
  SchemaValidationResult,
} from '@/types/core/SchemaValidation';

interface ValidateSchemaInput {
  connectionID: string;
  operationMethod: string;
  files: File[];
  path?: string;
}

interface DiffSchemaInput {
  connectionID: string;
  operationMethod: string;
  file: File;
  path?: string;
}

/**
 * Hook for validating data against connection schemas and comparing schema differences.
 *
 * @returns Mutations for schema validation and diff operations.
 */
export function useConnectionSchemaValidation() {
  const { getToken } = useIAM();
  const { locale } = useLocale();
  const { workspaceSlug } = useWorkspaceContext();
  const { irminAlert } = usePopup();

  // Mutation for validating data against a connection schema
  const validateSchemaMutation = useMutation<
    IrminAPIResponse<SchemaValidationResult>,
    Error,
    ValidateSchemaInput
  >({
    mutationFn: async ({ connectionID, operationMethod, files, path }) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      const res = await core.connectionService.validateSchema({
        workspace: workspaceSlug,
        connectionID,
        operationMethod,
        files,
        path,
      });
      return res;
    },
    onError: (error) => {
      irminAlert('error', error.message ?? 'Error validating schema');
    },
  });

  // Mutation for comparing data schema against connection schema
  const diffSchemaMutation = useMutation<
    IrminAPIResponse<SchemaDiff>,
    Error,
    DiffSchemaInput
  >({
    mutationFn: async ({ connectionID, operationMethod, file, path }) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      const res = await core.connectionService.diffSchema({
        workspace: workspaceSlug,
        connectionID,
        operationMethod,
        file,
        path,
      });
      return res;
    },
    onError: (error) => {
      irminAlert('error', error.message ?? 'Error comparing schemas');
    },
  });

  return {
    validateSchemaMutation,
    diffSchemaMutation,
  };
}
