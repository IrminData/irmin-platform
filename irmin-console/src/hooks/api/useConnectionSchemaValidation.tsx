import { useMutation } from '@tanstack/react-query';

import { useIrminCore } from '@/context/IrminCoreContext';
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
  const { getCore } = useIrminCore();
  const { workspaceSlug } = useWorkspaceContext();
  const { irminAlert } = usePopup();
  const { dict } = useLocale();

  // Mutation for validating data against a connection schema
  const validateSchemaMutation = useMutation<
    IrminAPIResponse<SchemaValidationResult>,
    Error,
    ValidateSchemaInput
  >({
    mutationFn: async ({ connectionID, operationMethod, files, path }) => {
      const core = await getCore();
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
      irminAlert(
        'error',
        error.message ?? dict.common.errors.mutations.validateSchemaFailed
      );
    },
  });

  // Mutation for comparing data schema against connection schema
  const diffSchemaMutation = useMutation<
    IrminAPIResponse<SchemaDiff>,
    Error,
    DiffSchemaInput
  >({
    mutationFn: async ({ connectionID, operationMethod, file, path }) => {
      const core = await getCore();
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
      irminAlert(
        'error',
        error.message ?? dict.common.errors.mutations.compareSchemasFailed
      );
    },
  });

  return {
    validateSchemaMutation,
    diffSchemaMutation,
  };
}
