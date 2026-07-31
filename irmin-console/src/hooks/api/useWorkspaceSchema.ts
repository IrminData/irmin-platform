import { useCallback, useEffect, useRef, useState } from 'react';

import { useIrminCore } from '@/context/IrminCoreContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { ObjectSchema } from '@/types/core/ObjectSchema';

/**
 * Hook to fetch the workspace schema
 *
 * @returns The workspace schema and loading state
 */
export function useWorkspaceSchema() {
  const { irminAlert } = usePopup();
  const { dict } = useLocale();
  const { getCore } = useIrminCore();
  const { workspaceSlug } = useWorkspaceContext();

  const [schema, setSchema] = useState<ObjectSchema | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchWorkspaceSchema = useCallback(async () => {
    try {
      setLoading(true);
      const core = await getCore();
      const schema = await core.workspaceService.getWorkspaceSchema({
        workspaceSlug,
      });
      setSchema(schema.data ?? null);
    } catch (error) {
      console.error(error);
      irminAlert(
        'error',
        (error as Error).message ??
          dict.common.errors.mutations.fetchWorkspaceSchemaFailed
      );
    } finally {
      setLoading(false);
    }
  }, [workspaceSlug, getCore, irminAlert, dict]);

  const fetchedSchemaForWorkspaceRef = useRef('');
  useEffect(() => {
    if (fetchedSchemaForWorkspaceRef.current === workspaceSlug) return;
    fetchedSchemaForWorkspaceRef.current = workspaceSlug;
    void fetchWorkspaceSchema();
  }, [fetchWorkspaceSchema, workspaceSlug]);

  return {
    schema,
    loading,
  };
}
