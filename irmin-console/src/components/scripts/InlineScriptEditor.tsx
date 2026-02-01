'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { IoSave } from 'react-icons/io5';
import { TbExternalLink } from 'react-icons/tb';

import SqlHelper from '@/components/query/helper/SqlHelper';
import CodeMirrorEditor from '@/components/scripts/ide/CodeMirrorEditor';
import CreateScriptModal from '@/components/scripts/modals/CreateScriptModal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { useScript, useScripts } from '@/hooks/api/useScripts';
import { useBaseUrl } from '@/hooks/utils';

interface InlineScriptEditorProps {
  currentScriptId: string | null;
  onScriptIdChange: (scriptId: string) => void;
  disabled?: boolean;
}

/**
 * Inline script editor component for workflows and pipeline stages
 * Allows selecting existing scripts or creating new ones, with built-in editor
 */
export default function InlineScriptEditor({
  currentScriptId,
  onScriptIdChange,
  disabled = false,
}: InlineScriptEditorProps) {
  const { dict } = useLocale();
  const { workspaceSlug } = useWorkspaceContext();
  const { irminModal, irminAlert, irminConfirm } = usePopup();
  const { scriptsQuery, createScriptMutation, updateScriptMutation } =
    useScripts();

  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'workspace',
    includeSegment: true,
    segmentsAfter: 1,
  });

  const [editorContent, setEditorContent] = useState('');
  const [language, setLanguage] = useState('go');
  const [originalContent, setOriginalContent] = useState('');
  const [isNewScript, setIsNewScript] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const hasUnsavedChangesRef = useRef(false);
  const isTransitioningFromNewScriptRef = useRef(false);
  const previousNormalizedScriptIdRef = useRef<string | null>(null);
  const isUserInitiatedChangeRef = useRef(false);

  const scripts = scriptsQuery.data?.data ?? [];
  // Normalize currentScriptId: empty string becomes null
  const normalizedScriptId = useMemo(
    () => (currentScriptId && currentScriptId.trim() ? currentScriptId : null),
    [currentScriptId]
  );
  // Store normalizedScriptId in a ref to avoid dependency issues
  const normalizedScriptIdRef = useRef(normalizedScriptId);

  const { scriptQuery } = useScript(normalizedScriptId ?? undefined);
  const currentScript = scriptQuery.data?.data;
  const scriptExists = normalizedScriptId
    ? scripts.some((s) => s.id === normalizedScriptId)
    : false;

  // Store onScriptIdChange in a ref to avoid including it in dependency arrays
  const onScriptIdChangeRef = useRef(onScriptIdChange);
  useEffect(() => {
    onScriptIdChangeRef.current = onScriptIdChange;
  }, [onScriptIdChange]);

  // Handle script deletion - if script was deleted externally, reset to blank
  useEffect(() => {
    if (normalizedScriptId && !scriptQuery.isLoading && scriptQuery.isError) {
      // Script fetch failed (likely deleted)
      irminAlert('error', dict.scripts.scriptNotFound);
      onScriptIdChangeRef.current('');
    } else if (
      normalizedScriptId &&
      !scriptQuery.isLoading &&
      scripts.length > 0 &&
      !scriptExists
    ) {
      // Script was deleted from list
      irminAlert('error', dict.scripts.scriptDeleted);
      onScriptIdChangeRef.current('');
    }
  }, [
    normalizedScriptId,
    scriptQuery.isLoading,
    scriptQuery.isError,
    scriptExists,
    scripts.length,
    irminAlert,
    dict.scripts.scriptNotFound,
    dict.scripts.scriptDeleted,
  ]);

  // Reset state immediately when scriptId changes (before data loads)
  // Only update if the value actually changed (not just a re-render)
  useEffect(() => {
    // Skip if this is a user-initiated change (handled by handleScriptSelect)
    if (isUserInitiatedChangeRef.current) {
      // Still update the refs even if skipping reset logic
      normalizedScriptIdRef.current = normalizedScriptId;
      previousNormalizedScriptIdRef.current = normalizedScriptId;
      return;
    }

    // Capture the previous value BEFORE updating refs
    const previousValue = previousNormalizedScriptIdRef.current;

    // Skip if the value hasn't actually changed
    if (previousValue === normalizedScriptId) {
      // Update refs to current value
      normalizedScriptIdRef.current = normalizedScriptId;
      previousNormalizedScriptIdRef.current = normalizedScriptId;
      return;
    }

    if (!normalizedScriptId) {
      // No script selected - show blank editor
      setEditorContent('');
      setOriginalContent('');
      setLanguage('go');
      setIsNewScript(true);
      setHasUnsavedChanges(false);
      isTransitioningFromNewScriptRef.current = false;
    } else {
      // Script ID exists
      // If we're transitioning from a newly created script, preserve the editor content
      // Otherwise, clear editor to prevent stale content from a different script
      if (!isTransitioningFromNewScriptRef.current) {
        setEditorContent('');
        setOriginalContent('');
      }
      setLanguage('go');
      setIsNewScript(false);
      setHasUnsavedChanges(false);
    }

    // Update refs AFTER reset logic completes
    normalizedScriptIdRef.current = normalizedScriptId;
    previousNormalizedScriptIdRef.current = normalizedScriptId;
  }, [normalizedScriptId]);

  // Load script content when it becomes available
  useEffect(() => {
    if (normalizedScriptId && currentScript && !scriptQuery.isLoading) {
      setEditorContent(currentScript.content ?? '');
      setOriginalContent(currentScript.content ?? '');
      setLanguage(currentScript.language ?? 'go');
      setIsNewScript(false);
      setHasUnsavedChanges(false);
      isTransitioningFromNewScriptRef.current = false;
    }
  }, [normalizedScriptId, currentScript, scriptQuery.isLoading]);

  // Track content changes
  useEffect(() => {
    let newHasUnsavedChanges = false;
    if (normalizedScriptId && !isNewScript) {
      // For existing scripts, compare current content with original
      newHasUnsavedChanges = editorContent !== originalContent;
    } else if (!normalizedScriptId || isNewScript) {
      // For new scripts, enable save if there's any content
      newHasUnsavedChanges = editorContent.trim().length > 0;
    }
    setHasUnsavedChanges(newHasUnsavedChanges);
    hasUnsavedChangesRef.current = newHasUnsavedChanges;
  }, [editorContent, originalContent, normalizedScriptId, isNewScript]);

  const handleScriptSelect = useCallback(
    async (scriptId: string) => {
      if (disabled) return;

      // Mark this as a user-initiated change
      isUserInitiatedChangeRef.current = true;

      // Normalize the selected script ID for comparison
      const normalizedSelectedId =
        scriptId === '__create_new__' ? null : scriptId;
      const normalizedCurrentId = normalizedScriptIdRef.current;

      // Prevent unnecessary updates if the value hasn't changed
      // This is critical to prevent infinite loops
      if (normalizedSelectedId === normalizedCurrentId) {
        isUserInitiatedChangeRef.current = false;
        return;
      }

      // Check for unsaved changes - use ref to avoid dependency
      if (hasUnsavedChangesRef.current) {
        const confirmed = await irminConfirm(
          'warning',
          dict.scripts.unsavedChangesDiscard
        );
        if (!confirmed) {
          isUserInitiatedChangeRef.current = false;
          return;
        }
      }

      if (scriptId === '__create_new__') {
        // Create new script
        setIsNewScript(true);
        setEditorContent('');
        setOriginalContent('');
        setLanguage('go');
        setHasUnsavedChanges(false);
        onScriptIdChangeRef.current('');
      } else {
        // Select existing script
        onScriptIdChangeRef.current(scriptId);
      }

      // Reset the flag after a short delay to allow state updates to complete
      setTimeout(() => {
        isUserInitiatedChangeRef.current = false;
      }, 0);
    },
    [disabled, irminConfirm, dict.scripts.unsavedChangesDiscard]
  );

  const handleSave = useCallback(async () => {
    if (disabled) return;

    if (!normalizedScriptId || isNewScript) {
      // Create new script - show modal
      irminModal.show(
        dict.scripts.createScript,
        <CreateScriptModal
          workspaceSlug={workspaceSlug}
          defaultName={editorContent.trim().slice(0, 50) || 'untitled'}
          onSubmit={async (name, description, tags) => {
            try {
              const result = await createScriptMutation.mutateAsync({
                name,
                description,
                content: editorContent,
                language,
                tags: tags?.map((tag) => tag.id),
              });

              const newScriptId = result.data?.id;
              if (!newScriptId)
                throw new Error(dict.scripts.failedToCreateScript);

              // Preserve editor content when transitioning from new script to saved script
              isTransitioningFromNewScriptRef.current = true;
              setOriginalContent(editorContent);
              setIsNewScript(false);
              setHasUnsavedChanges(false);
              onScriptIdChangeRef.current(newScriptId);

              irminModal.close();
              // Success alert is already shown by createScriptMutation.onSuccess
            } catch (error) {
              console.error('Error creating script:', error);
              irminAlert(
                'error',
                (error as Error)?.message ?? dict.scripts.failedToCreateScript
              );
            }
          }}
          onCancel={() => irminModal.close()}
        />
      );
    } else {
      // Update existing script
      // normalizedScriptId is guaranteed to be non-null here due to the condition above
      if (!normalizedScriptId) return;
      const scriptIdToUpdate = normalizedScriptId;
      try {
        await updateScriptMutation.mutateAsync({
          scriptId: scriptIdToUpdate,
          content: editorContent,
        });

        setOriginalContent(editorContent);
        setHasUnsavedChanges(false);
        // Success alert is already shown by updateScriptMutation.onSuccess
      } catch (error) {
        console.error('Error updating script:', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? dict.scripts.failedToUpdateScript
        );
      }
    }
  }, [
    disabled,
    normalizedScriptId,
    isNewScript,
    editorContent,
    language,
    workspaceSlug,
    createScriptMutation,
    updateScriptMutation,
    irminModal,
    irminAlert,
    dict,
  ]);

  const enableSaveButton = useMemo(() => {
    if (disabled) return false;
    if (!normalizedScriptId || isNewScript) {
      return editorContent.trim().length > 0;
    }
    return hasUnsavedChanges;
  }, [
    disabled,
    normalizedScriptId,
    isNewScript,
    editorContent,
    hasUnsavedChanges,
  ]);

  const selectedScriptValue = useMemo(
    () => normalizedScriptId || '__create_new__',
    [normalizedScriptId]
  );

  // Store handleScriptSelect in a ref to avoid dependency issues
  const handleScriptSelectRef = useRef(handleScriptSelect);
  useEffect(() => {
    handleScriptSelectRef.current = handleScriptSelect;
  }, [handleScriptSelect]);

  // Wrapper to prevent Select from triggering updates on programmatic value changes
  const handleSelectValueChange = useCallback((scriptId: string) => {
    // Only proceed if this is a user-initiated change
    // The Select component might call this when value prop changes programmatically
    const currentValue = normalizedScriptIdRef.current || '__create_new__';
    if (scriptId === currentValue) {
      // Value hasn't changed, ignore - this prevents infinite loops
      return;
    }
    // Use ref to call the handler to avoid dependency issues
    handleScriptSelectRef.current(scriptId);
  }, []);

  return (
    <div className='flex h-full flex-col gap-2'>
      <div className='flex flex-col gap-2'>
        <Label>{dict.workflow.pipeline.executableScript}</Label>
        <Select
          value={selectedScriptValue}
          onValueChange={handleSelectValueChange}
          disabled={disabled || scriptsQuery.isLoading}
        >
          <SelectTrigger className='w-full'>
            <SelectValue placeholder={dict.scripts.selectScript} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='__create_new__'>
              {dict.scripts.createScript}
            </SelectItem>
            {scriptsQuery.isLoading ? (
              <SelectItem value='loading' disabled>
                {dict.common.loading}
              </SelectItem>
            ) : scripts.length === 0 ? (
              <SelectItem value='no-scripts' disabled>
                {dict.list.noItems}
              </SelectItem>
            ) : (
              scripts.map((script) => (
                <SelectItem key={script.id} value={script.id}>
                  {script.name} {script.language && `(${script.language})`}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {normalizedScriptId && (
          <Button
            href={`${workspaceUrl}/scripts?script=${normalizedScriptId}`}
            target='_blank'
            variant='secondary'
            className='w-full'
            icon={<TbExternalLink />}
          >
            {dict.common.view}
          </Button>
        )}
      </div>

      {/* Editor Controls */}
      <div
        className={`
          flex items-center justify-between gap-2 border-b border-gray-200 pb-2
          dark:border-gray-800
        `}
      >
        <div className='flex items-center gap-2'>
          <select
            value={language}
            onChange={(e) => {
              if (!disabled && (!normalizedScriptId || isNewScript)) {
                setLanguage(e.target.value);
              }
            }}
            disabled={disabled || (!!normalizedScriptId && !isNewScript)}
            className={`
              w-24 rounded-md border bg-background px-2 py-1 text-sm
              disabled:opacity-50
              dark:border-gray-700
            `}
          >
            <option value='go'>Go</option>
          </select>
          <SqlHelper currentSql={editorContent} />
        </div>
        <Button
          onClick={handleSave}
          variant='default'
          size='sm'
          icon={<IoSave />}
          disabled={
            !enableSaveButton ||
            disabled ||
            createScriptMutation.isPending ||
            updateScriptMutation.isPending
          }
        >
          {createScriptMutation.isPending || updateScriptMutation.isPending
            ? dict.scripts.saving
            : dict.common.save}
        </Button>
      </div>

      {/* Code Editor */}
      <div className='flex-1'>
        {scriptQuery.isLoading && normalizedScriptId ? (
          <div
            className={`
              flex h-full items-center justify-center text-muted-foreground
            `}
          >
            {dict.common.loading}
          </div>
        ) : scriptQuery.isError && normalizedScriptId ? (
          <div
            className={`
              flex h-full flex-col items-center justify-center gap-2
              text-muted-foreground
            `}
          >
            <p>{dict.common.somethingWentWrong}</p>
            <Button
              variant='secondary'
              size='sm'
              onClick={() => {
                onScriptIdChangeRef.current('');
              }}
            >
              {dict.scripts.reset}
            </Button>
          </div>
        ) : (
          <CodeMirrorEditor
            language={language}
            content={editorContent}
            updateEditorContent={setEditorContent}
            editorHeight='400px'
            editable={!disabled}
          />
        )}
      </div>

      {/* Script Info */}
      {currentScript && (
        <div className='text-sm text-muted-foreground'>
          <div>
            <strong>{dict.scripts.owner}:</strong>{' '}
            {currentScript.owner.first_name} {currentScript.owner.last_name}
          </div>
          {currentScript.tags && currentScript.tags.length > 0 && (
            <div>
              <strong>{dict.common.tags}:</strong>{' '}
              {currentScript.tags.map((tag) => tag.name).join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
