import { useCallback, useEffect, useRef, useState } from 'react';

import IrminCore from '@/lib/core';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/WorkspaceContext';

import { ObjectSchema } from '@/types/core/ObjectSchema';

/**
 * Hook to fetch the workspace schema
 *
 * @returns The workspace schema and loading state
 */
export function useWorkspaceSchema() {
  const { irminAlert } = usePopup();
  const { locale } = useLocale();
  const { getToken } = useIAM();
  const { workspaceSlug } = useWorkspace();

  const [schema, setSchema] = useState<ObjectSchema | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchWorkspaceSchema = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const irminCore = new IrminCore(locale, token);
      const schema = await irminCore.workspaceService.getWorkspaceSchema({
        workspaceSlug,
      });
      setSchema(schema.data ?? null);
    } catch (error) {
      console.error(error);
      irminAlert(
        'error',
        (error as Error).message ?? 'Failed to fetch workspace schema'
      );
    } finally {
      setLoading(false);
    }
  }, [workspaceSlug, getToken, locale, irminAlert]);

  const fetchedSchemaForWorkspaceRef = useRef('');
  useEffect(() => {
    if (fetchedSchemaForWorkspaceRef.current === workspaceSlug) return;
    fetchedSchemaForWorkspaceRef.current = workspaceSlug;
    fetchWorkspaceSchema();
  }, [fetchWorkspaceSchema, workspaceSlug]);

  return {
    schema,
    loading,
  };
}
