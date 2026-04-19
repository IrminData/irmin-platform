'use client';

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useSearchParams } from 'next/navigation';

import {
  TbChevronRight,
  TbPencil,
  TbSearch,
  TbTemplate,
  TbTrash,
  TbX,
} from 'react-icons/tb';

import { TemplateLibraryModal } from '@/components/scripts/TemplateLibraryModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { QueryError } from '@/components/ui/error/QueryError';
import SafeComponent from '@/components/ui/error/SafeComponent';
import ListSkeleton from '@/components/ui/loading/ListSkeleton';
import WorkspaceTagDisplay from '@/components/workspace/WorkspaceTagDisplay';
import { WorkspaceTagSelector } from '@/components/workspace/WorkspaceTagSelector';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useScriptEditor } from '@/context/ScriptEditorContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { useWorkspaceTags } from '@/hooks/api';
import { useScriptTemplates } from '@/hooks/api/useScriptTemplates';
import { useResourceAllowed, useToggleCreateParam } from '@/hooks/utils';

import type { StoredScript } from '@/types/core/Script';
import type { Tag } from '@/types/core/Tag';

import EditorWithTabs from './ide/EditorWithTabs';
import ScriptResults from './ScriptResults';

/**
 * Scripts Section, provides UI for the Scripts Page.
 * Used to manage and edit scripts in the Workspace
 */
export default function ScriptsSection() {
  return (
    <Suspense>
      <ScriptsSectionContent />
    </Suspense>
  );
}

function ScriptsSectionContent() {
  const { dict } = useLocale();
  const { irminAlert, irminConfirm } = usePopup();
  const { workspaceSlug } = useWorkspaceContext();
  const { isResourceAllowed } = useResourceAllowed();
  const searchParams = useSearchParams();
  const { setCreateParam } = useToggleCreateParam();

  const {
    scripts,
    scriptsError,
    refetchScripts,
    loading,
    enableSaveButton,
    currentTab,
    openTabs,
    scriptExecutionInProgress,
    scriptExecutionResult,
    executeScript,
    scriptInputFiles,
    setScriptInputFiles,
    openNewTab,
    openScript,
    deleteScript,
    updateScriptMetadata,
    updateCurrentTabContent,
  } = useScriptEditor();

  const { scriptTemplatesQuery } = useScriptTemplates();
  const [templateModalOpen, setTemplateModalOpen] = useState(false);

  const [selectedScript, setSelectedScript] = useState<StoredScript | null>(
    null
  );

  const handleTemplateSelect = useCallback(
    (content: string, createNew: boolean) => {
      if (createNew || !currentTab) {
        openNewTab(content);
        return;
      }

      updateCurrentTabContent(content);
    },
    [currentTab, openNewTab, updateCurrentTabContent]
  );

  const [searchQuery, setSearchQuery] = useState('');

  // Handle create param
  const hasHandledCreateRef = useRef(false);
  useEffect(() => {
    if (searchParams.has('create')) {
      if (hasHandledCreateRef.current) return;
      if (isResourceAllowed('script', 'create')) {
        hasHandledCreateRef.current = true;
        openNewTab();
        setCreateParam(false);
      }
    } else {
      hasHandledCreateRef.current = false;
    }
  }, [searchParams, openNewTab, setCreateParam, isResourceAllowed]);

  // Filter scripts based on search
  const filteredScripts = useMemo(
    () =>
      scripts.filter((script) =>
        script.name.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [scripts, searchQuery]
  );

  // Tag editing functionality
  const { addTagToEntityMutation, removeTagFromEntityMutation } =
    useWorkspaceTags(workspaceSlug);

  const canViewTags = useMemo(
    () =>
      isResourceAllowed('workspace_tag', 'read') &&
      isResourceAllowed('script', 'read', selectedScript?.id),
    [isResourceAllowed, selectedScript?.id]
  );

  const canChangeTags = useMemo(
    () =>
      isResourceAllowed('workspace_tag', 'create') &&
      isResourceAllowed('script', 'update', selectedScript?.id),
    [isResourceAllowed, selectedScript?.id]
  );

  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [updatingTags, setUpdatingTags] = useState(false);
  const previousTags = useRef<string>('');
  const currentTagsRef = useRef<Tag[]>([]);

  // Update selected tags when script changes
  const handleScriptSelect = useCallback(
    (script: StoredScript) => {
      setSelectedScript(script);
      const tags = script.tags ?? [];
      setSelectedTags(tags);
      currentTagsRef.current = tags;
      previousTags.current = '';
      openScript(script.id);
    },
    [openScript]
  );

  // Reset selectedTags when the selected script or its list entry changes.
  const currentScriptFromList = selectedScript
    ? scripts.find((s) => s.id === selectedScript.id)
    : undefined;
  const buildScriptKey = (script: StoredScript | null | undefined) => {
    if (!selectedScript) return null;
    if (!script) return `${selectedScript.id}:missing`;
    const tagSignature = (script.tags ?? [])
      .map((t) => t.id)
      .sort()
      .join(',');
    return `${selectedScript.id}:${tagSignature}`;
  };
  const [prevScriptKey, setPrevScriptKey] = useState<string | null>(
    buildScriptKey(currentScriptFromList)
  );
  const scriptKey = buildScriptKey(currentScriptFromList);
  if (scriptKey !== prevScriptKey) {
    setPrevScriptKey(scriptKey);
    if (selectedScript && !currentScriptFromList) {
      // Script no longer exists in the list (e.g., deleted externally)
      setSelectedScript(null);
      setSelectedTags([]);
    } else if (currentScriptFromList) {
      setSelectedTags(currentScriptFromList.tags ?? []);
    }
  }

  // Sync diff-tracking refs (can't mutate refs during render).
  useEffect(() => {
    currentTagsRef.current = selectedScript
      ? (currentScriptFromList?.tags ?? [])
      : [];
    previousTags.current = '';
  }, [selectedScript, currentScriptFromList]);

  const handleUpdateTags = useCallback(
    async (tags: Tag[]) => {
      if (!selectedScript) return tags;
      const currentTags = currentTagsRef.current;
      try {
        if (previousTags.current === JSON.stringify(tags)) {
          return tags;
        }

        setSelectedTags(tags);
        currentTagsRef.current = tags;
        setUpdatingTags(true);

        const tagsToAdd = [];
        const tagsToRemove = [];
        for (const tag of tags) {
          if (!currentTags.some((t) => t.id === tag.id)) {
            tagsToAdd.push(tag);
          }
        }
        for (const tag of currentTags) {
          if (!tags.some((t) => t.id === tag.id)) {
            tagsToRemove.push(tag);
          }
        }
        await Promise.all([
          ...tagsToAdd.map((tag) =>
            addTagToEntityMutation.mutateAsync({
              id: tag.id,
              entityType: 'scripts',
              entityId: selectedScript.id,
            })
          ),
          ...tagsToRemove.map((tag) =>
            removeTagFromEntityMutation.mutateAsync({
              id: tag.id,
              entityType: 'scripts',
              entityId: selectedScript.id,
            })
          ),
        ]);

        previousTags.current = JSON.stringify(tags);
        return tags;
      } catch (error) {
        console.error('Error updating tags:', error);
        const fallbackTags = currentTags;
        setSelectedTags(fallbackTags);
        currentTagsRef.current = fallbackTags;
        previousTags.current = JSON.stringify(fallbackTags);
        return fallbackTags;
      } finally {
        setUpdatingTags(false);
      }
    },
    [addTagToEntityMutation, removeTagFromEntityMutation, selectedScript]
  );

  const handleDeleteScript = useCallback(async () => {
    if (!selectedScript) return;
    const confirmed = await irminConfirm(
      'warning',
      `${dict.common.areYouSureYouWantToDelete}: ${selectedScript.name}`
    );
    if (!confirmed) return;
    const success = await deleteScript(selectedScript.id);
    if (success) {
      setSelectedScript(null);
    }
  }, [selectedScript, deleteScript, dict, irminConfirm]);

  return (
    <SafeComponent
      level='section'
      title='Scripts Interface Error'
      description='Failed to load scripts interface'
    >
      <div className='flex size-full flex-col bg-background'>
        <div
          className={`
            flex flex-1 flex-col overflow-hidden
            lg:flex-row
          `}
        >
          {/* Left sidebar - Script list */}
          <div
            className={`
              order-3 flex min-h-80 w-full flex-col overflow-y-scroll border-t
              border-border
              lg:order-1 lg:w-80 lg:shrink-0 lg:border-0 lg:border-r
            `}
          >
            <div className='flex flex-col gap-2 p-2'>
              <Button
                className='w-full'
                variant='default'
                onClick={() => openNewTab()}
                disabled={!isResourceAllowed('script', 'create') || loading}
              >
                {dict.scripts.createScript}
              </Button>
              <Button
                className='w-full'
                variant='outline'
                onClick={() => setTemplateModalOpen(true)}
                disabled={!isResourceAllowed('script', 'create') || loading}
                icon={<TbTemplate />}
              >
                {dict.common.createFromTemplate}
              </Button>
            </div>
            <div className='border-b p-2'>
              <div className='relative'>
                <TbSearch
                  className={`
                    absolute top-1/2 left-2 -translate-y-1/2
                    text-muted-foreground
                  `}
                  size={16}
                />
                <input
                  type='text'
                  placeholder={dict.scripts.searchScripts}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`
                    w-full rounded-md border border-border bg-background py-1.5
                    pr-2 pl-8 text-sm transition-colors
                    focus:border-primary focus:ring-1 focus:ring-primary
                    focus:outline-none
                  `}
                />
              </div>
            </div>
            {loading && <ListSkeleton items={6} className='p-2' />}
            {scriptsError && (
              <QueryError
                error={scriptsError}
                onRetry={() => refetchScripts()}
                title={dict.common.errors.failedToLoadScripts}
                description={dict.common.errors.failedToLoadAgain}
                size='sm'
                className='m-4'
              />
            )}
            {!loading && !scriptsError && filteredScripts.length === 0 && (
              <div className='p-4'>
                <div className='py-8 text-center'>
                  <h3
                    className={`
                      mb-2 text-lg font-medium text-gray-700
                      dark:text-gray-300
                    `}
                  >
                    {dict.list.emptyState.scripts.title}
                  </h3>
                  <p
                    className={`
                      mx-auto mb-4 max-w-sm text-gray-500
                      dark:text-gray-400
                    `}
                  >
                    {dict.list.emptyState.scripts.description}
                  </p>
                </div>
              </div>
            )}
            {!loading &&
              !scriptsError &&
              filteredScripts.map((script) => (
                <div
                  key={`script-${script.id}`}
                  className={`
                    flex cursor-pointer flex-row items-center justify-between
                    gap-2 border-b border-border p-4 transition-colors
                    hover:bg-card
                    ${selectedScript?.id === script.id ? `bg-card` : ''}
                  `}
                  onClick={() => handleScriptSelect(script)}
                  role='button'
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleScriptSelect(script);
                    }
                  }}
                >
                  <div className='flex flex-col gap-1'>
                    <p className='text-sm'>{script.name}</p>
                    {script.description && (
                      <p className='text-xs text-foreground/50'>
                        {script.description}
                      </p>
                    )}
                    {script.tags && script.tags.length > 0 && (
                      <div className='mt-1'>
                        <WorkspaceTagDisplay
                          tags={script.tags}
                          maxVisible={3}
                          size='sm'
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <TbChevronRight size={22} />
                  </div>
                </div>
              ))}
          </div>

          {/* Center - Editor */}
          <div
            className={`
              relative order-1 flex flex-1 flex-col overflow-hidden
              lg:order-2 lg:min-w-0 lg:grow
            `}
          >
            <EditorWithTabs />
            {openTabs.length > 0 && (
              <div className='flex min-h-0 flex-1 flex-col'>
                <ScriptResults
                  result={scriptExecutionResult}
                  loading={scriptExecutionInProgress}
                  inputFiles={scriptInputFiles}
                  setInputFiles={setScriptInputFiles}
                  onRun={async () => {
                    if (!currentTab) return;
                    if (scriptExecutionInProgress) return;
                    if (enableSaveButton || !currentTab.scriptId) {
                      irminAlert('info', dict.scripts.scriptNeedsToBeSaved);
                      return;
                    }
                    executeScript(currentTab.scriptId);
                  }}
                />
              </div>
            )}
          </div>

          {/* Right sidebar - Script details */}
          {selectedScript && (
            <div
              className={`
                relative order-2 flex w-full flex-col gap-2 border-t
                border-border p-2
                lg:order-3 lg:w-80 lg:min-w-80 lg:shrink-0 lg:overflow-y-scroll
                lg:border-0 lg:border-l
              `}
            >
              <Button
                size='icon'
                variant='ghost'
                onClick={() => setSelectedScript(null)}
                icon={<TbX size={22} />}
                className='absolute top-2 right-2'
              />
              <Badge className='mt-2'>{dict.scripts.scriptManagement}</Badge>
              <p className='text-sm'>{selectedScript.name}</p>
              {selectedScript.description && (
                <p className='mb-2 text-xs text-foreground/50'>
                  {selectedScript.description}
                </p>
              )}

              {/* Owner section */}
              <div
                className={`
                  mb-4 border-b border-gray-200 pb-4
                  dark:border-gray-800
                `}
              >
                <p className='mb-1 text-xs font-medium text-foreground/70'>
                  {dict.common.owner}
                </p>
                <p className='text-sm'>
                  {selectedScript.owner.first_name}{' '}
                  {selectedScript.owner.last_name}
                </p>
              </div>

              {/* Tags section */}
              {canViewTags && (
                <div
                  className={`
                    mb-4 border-b border-gray-200 pb-4
                    dark:border-gray-800
                  `}
                >
                  <WorkspaceTagSelector
                    selectedTags={selectedTags}
                    onTagsChange={handleUpdateTags}
                    loading={updatingTags}
                    disabled={!canChangeTags}
                    workspaceSlug={workspaceSlug}
                  />
                </div>
              )}

              <Button
                variant='secondary'
                size='sm'
                className='w-full'
                icon={<TbPencil />}
                onClick={() => updateScriptMetadata(selectedScript)}
                disabled={
                  !isResourceAllowed('script', 'update', selectedScript.id)
                }
              >
                {dict.common.edit}
              </Button>
              <Button
                variant='secondary'
                size='sm'
                className='w-full'
                icon={<TbTrash />}
                onClick={handleDeleteScript}
                disabled={
                  !isResourceAllowed('script', 'delete', selectedScript.id)
                }
              >
                {dict.common.delete}
              </Button>
            </div>
          )}
        </div>
      </div>
      <TemplateLibraryModal
        open={templateModalOpen}
        onOpenChange={setTemplateModalOpen}
        templates={scriptTemplatesQuery.data?.data || []}
        loading={scriptTemplatesQuery.isLoading}
        onSelectTemplate={handleTemplateSelect}
      />
    </SafeComponent>
  );
}
