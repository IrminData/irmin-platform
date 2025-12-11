'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { useQueryClient } from '@tanstack/react-query';

import IrminCore from '@/lib/core';
import { scriptsQueryKey } from '@/lib/queryKeys';

import CreateScriptModal from '@/components/scripts/modals/CreateScriptModal';
import UpdateScriptModal from '@/components/scripts/modals/UpdateScriptModal';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { useScripts, useUsers } from '@/hooks/api';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { ScriptResult, StoredScript } from '@/types/core/Script';
import type { ActionInputData } from '@/types/core/Workflow';

interface ScriptTab {
  id: string; // Unique tab ID
  scriptId?: string; // Script ID if saved
  name: string;
  content: string;
  originalContent: string;
  language?: string;
  isSaved: boolean;
}

interface ScriptEditorContextType {
  scripts: StoredScript[];
  scriptsError: Error | null;
  refetchScripts: () => void;
  loading: boolean;
  // Editor Tabs and Contents
  openTabs: ScriptTab[];
  activeTab: number;
  editorHeight: string;
  currentTab: ScriptTab | undefined;
  enableSaveButton: boolean;
  // State Setters
  setActiveTab: (_index: number) => void;
  setEditorHeight: (_height: string) => void;
  // Editor Actions
  openNewTab: () => void;
  openScript: (_scriptId: string) => void;
  closeTab: (_tabId: string) => void;
  updateCurrentTabContent: (_content: string) => void;
  saveCurrentTab: () => void;
  changeLanguage: (_language: string) => void;
  // Script Actions
  updateScriptMetadata: (_script: StoredScript) => void;
  deleteScript: (_scriptId: string) => Promise<boolean>;
  // Script Execution
  scriptExecutionInProgress: boolean;
  scriptExecutionResult: ScriptResult | null;
  executeScript: (_scriptId: string) => void;
  // Script Input Files
  scriptInputFiles: ActionInputData[];
  setScriptInputFiles: (_files: ActionInputData[]) => void;
}

const ScriptEditorContext = createContext<ScriptEditorContextType | undefined>(
  undefined
);

export const ScriptEditorProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { getToken } = useIAM();
  const { dict, locale } = useLocale();
  const { workspaceSlug } = useWorkspaceContext();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { irminModal, irminAlert } = usePopup();

  const queryClient = useQueryClient();

  const {
    scriptsQuery,
    createScriptMutation,
    updateScriptMutation,
    deleteScriptMutation,
    executeScriptMutation,
    transferScriptMutation,
  } = useScripts();

  const { usersQuery } = useUsers();

  // State for script input files
  const [scriptInputFiles, setScriptInputFiles] = useState<ActionInputData[]>(
    []
  );

  // State for open tabs and active tab index
  const [openTabs, setOpenTabs] = useState<ScriptTab[]>([]);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [editorHeight, setEditorHeight] = useState('600px');
  const [untitledCounter, setUntitledCounter] = useState(1);

  // Ref to store latest openTabs state for access in callbacks
  const openTabsRef = useRef<ScriptTab[]>([]);
  useEffect(() => {
    openTabsRef.current = openTabs;
  }, [openTabs]);

  // Get the current tab based on active tab index
  const currentTab = useMemo(
    () => openTabs[activeTabIndex],
    [openTabs, activeTabIndex]
  );

  /**
   * Opens a new tab with an untitled script.
   * Defaults to Go since scripts are executed in Go
   */
  const openNewTab = useCallback(() => {
    const untitledName = `untitled_${untitledCounter}.go`;

    const newTab: ScriptTab = {
      id: crypto.randomUUID(),
      name: untitledName,
      content: '',
      originalContent: '',
      language: 'go',
      isSaved: false,
    };

    setOpenTabs((prev) => {
      const updated = [...prev, newTab];
      setActiveTabIndex(updated.length - 1);
      return updated;
    });
    setUntitledCounter((prev) => prev + 1);
  }, [untitledCounter]);

  /**
   * Opens a script in a new tab by ID.
   *
   * @param scriptId - The ID of the script to open
   */
  const openScript = useCallback(
    async (scriptId: string) => {
      const existingTabIndex = openTabs.findIndex(
        (tab) => tab.scriptId === scriptId
      );

      if (existingTabIndex === -1) {
        let scriptData: StoredScript | null = null;
        try {
          // Fetch script data from the server
          const scriptRes = await queryClient.fetchQuery({
            queryKey: scriptsQueryKey(workspaceSlug, scriptId),
            queryFn: async () => {
              const token = await getToken();
              const core = new IrminCore(locale, token);
              return await core.scriptsService.getScript({
                workspace: workspaceSlug,
                scriptId,
              });
            },
          });
          scriptData = scriptRes.data ?? null;
        } catch (error) {
          console.error('Error fetching script', error);
          irminAlert(
            'error',
            (error as Error)?.message ?? 'Failed to load script.'
          );
          return;
        }

        if (!scriptData) return;

        const newTab: ScriptTab = {
          id: crypto.randomUUID(),
          scriptId: scriptData.id,
          name: scriptData.name,
          content: scriptData.content ?? '',
          originalContent: scriptData.content ?? '',
          language: scriptData.language,
          isSaved: true,
        };

        setOpenTabs((prev) => {
          const existingIndex = prev.findIndex(
            (tab) => tab.scriptId === scriptData!.id
          );
          if (existingIndex !== -1) {
            setActiveTabIndex(existingIndex);
            return prev;
          }

          const updated = [...prev, newTab];
          setActiveTabIndex(updated.length - 1);
          return updated;
        });

        // Update URL search parameters to include the new script ID
        const currentSearchParams = new URLSearchParams(
          searchParams.toString()
        );
        const ids = currentSearchParams.getAll('script');
        if (!ids.includes(scriptId)) {
          currentSearchParams.append('script', scriptId);
          router.push(`${pathname}?${currentSearchParams.toString()}`);
        }
      } else {
        setActiveTabIndex(existingTabIndex);
      }
    },
    [
      workspaceSlug,
      openTabs,
      irminAlert,
      getToken,
      locale,
      queryClient,
      router,
      pathname,
      searchParams,
    ]
  );

  /**
   * Initialize open tabs from search parameters.
   */
  const setInitialOpenTabs = useRef(false);
  useEffect(() => {
    if (setInitialOpenTabs.current) return;
    if (scriptsQuery.isLoading) return;

    const scriptIds = searchParams.getAll('script');
    if (scriptIds.length === 0) {
      setInitialOpenTabs.current = true;
      return;
    }

    queueMicrotask(() => {
      for (let i = 0; i < scriptIds.length; i++) {
        const scriptId = scriptIds[i];
        if (!scriptId) continue;
        if (openTabs.some((tab) => tab.scriptId === scriptId)) continue;
        void openScript(scriptId);
      }
      setInitialOpenTabs.current = true;
    });
  }, [searchParams, openTabs, openScript, scriptsQuery.isLoading]);

  /**
   * Closes a tab by ID.
   *
   * @param tabId - ID of the tab to close.
   */
  const closeTab = useCallback(
    (tabId: string) => {
      const tabIndex = openTabs.findIndex((tab) => tab.id === tabId);
      if (tabIndex !== -1) {
        const tab = openTabs[tabIndex];
        setOpenTabs((prev) => prev.filter((t) => t.id !== tabId));

        // Adjust active tab index if necessary
        if (activeTabIndex >= tabIndex) {
          setActiveTabIndex((prevIndex) => Math.max(prevIndex - 1, 0));
        }

        // Update URL search parameters if this was a saved script
        if (tab.scriptId) {
          const newSearchParams = new URLSearchParams(searchParams.toString());
          newSearchParams.delete('script', tab.scriptId);
          router.push(`${pathname}?${newSearchParams.toString()}`);
        }
      }
    },
    [activeTabIndex, searchParams, openTabs, router, pathname]
  );

  /**
   * Updates the content of the current tab.
   *
   * @param newContent - New content for the current tab.
   */
  const updateCurrentTabContent = useCallback(
    (newContent: string) => {
      if (!currentTab) return;
      setOpenTabs((prev) =>
        prev.map((tab) =>
          tab.id === currentTab.id ? { ...tab, content: newContent } : tab
        )
      );
    },
    [currentTab]
  );

  /**
   * Determines if the save button should be enabled.
   * For new scripts: enabled if there's any content (allows saving new scripts).
   * For saved scripts: enabled only if content has changed from original.
   */
  const enableSaveButton = useMemo(() => {
    if (!currentTab) return false;
    // For new scripts, enable if there's any content
    if (!currentTab.isSaved) {
      return currentTab.content.trim().length > 0;
    }
    // For saved scripts, enable only if content has changed
    return currentTab.content !== currentTab.originalContent;
  }, [currentTab]);

  /**
   * Saves the current tab (create new or update existing script).
   */
  const saveCurrentTab = useCallback(async () => {
    if (!currentTab) return;

    try {
      if (currentTab.isSaved && currentTab.scriptId) {
        // Update existing script
        await updateScriptMutation.mutateAsync({
          scriptId: currentTab.scriptId,
          content: currentTab.content,
        });

        // Update the tab to reflect saved state
        setOpenTabs((prev) =>
          prev.map((tab) =>
            tab.id === currentTab.id
              ? { ...tab, originalContent: currentTab.content }
              : tab
          )
        );

        irminAlert('success', dict.common.saved);
      } else {
        // Create new script - show modal for metadata
        // Capture tabId to identify which tab to update, but retrieve latest state at execution time
        const tabIdToSave = currentTab.id;
        irminModal.show(
          dict.scripts.createScript,
          <CreateScriptModal
            workspaceSlug={workspaceSlug}
            defaultName={currentTab.name.replace(/\.\w+$/, '')}
            onSubmit={async (name, description, tags) => {
              try {
                // Retrieve the current tab state at execution time to avoid stale closure values
                const latestTab = openTabsRef.current.find(
                  (tab) => tab.id === tabIdToSave
                );
                if (!latestTab) {
                  throw new Error('Tab not found');
                }

                const result = await createScriptMutation.mutateAsync({
                  name,
                  description,
                  content: latestTab.content,
                  language: latestTab.language,
                  tags: tags?.map((tag) => tag.id),
                });

                const newScriptId = result.data?.id;
                if (!newScriptId) throw new Error('Failed to create script');

                // Update the tab to reflect the new saved script
                setOpenTabs((prev) =>
                  prev.map((tab) =>
                    tab.id === tabIdToSave
                      ? {
                          ...tab,
                          scriptId: newScriptId,
                          isSaved: true,
                          originalContent: tab.content,
                          name: result.data?.name ?? tab.name,
                        }
                      : tab
                  )
                );

                // Update URL with the new script ID
                const newSearchParams = new URLSearchParams(
                  searchParams.toString()
                );
                newSearchParams.append('script', newScriptId);
                router.push(`${pathname}?${newSearchParams.toString()}`);

                irminModal.close();
                irminAlert('success', dict.common.saved);
              } catch (error) {
                console.error('Error creating script:', error);
                irminAlert(
                  'error',
                  (error as Error)?.message ?? 'Failed to create script'
                );
              }
            }}
            onCancel={() => irminModal.close()}
          />
        );
        return;
      }
    } catch (error) {
      console.error('Error saving script:', error);
      irminAlert('error', (error as Error)?.message ?? 'Failed to save script');
    }
  }, [
    currentTab,
    updateScriptMutation,
    createScriptMutation,
    irminAlert,
    irminModal,
    dict,
    searchParams,
    router,
    pathname,
    workspaceSlug,
  ]);

  /**
   * Changes the language of the active tab (only for unsaved scripts).
   *
   * @param language - New language for syntax highlighting.
   */
  const changeLanguage = useCallback(
    (language: string) => {
      if (!currentTab) return;
      setOpenTabs((prev) =>
        prev.map((tab) => {
          if (tab.id !== currentTab.id) return tab;
          // Only change language for unsaved scripts
          if (!tab.isSaved) {
            const newName = tab.name.replace(/\.\w+$/, `.${language}`);
            return { ...tab, language, name: newName };
          }
          return tab;
        })
      );
    },
    [currentTab]
  );

  /**
   * Opens the update script metadata modal.
   *
   * @param script - The script to update.
   */
  const updateScriptMetadata = useCallback(
    (script: StoredScript) => {
      irminModal.show(
        dict.scripts.updateScript,
        <UpdateScriptModal
          script={script}
          updateScriptMutation={updateScriptMutation}
          transferScriptMutation={transferScriptMutation}
          usersQuery={usersQuery}
          onClose={() => irminModal.close()}
          onSuccess={async (updatedScript: StoredScript) => {
            // Update the scripts list cache optimistically
            queryClient.setQueryData<IrminAPIResponse<StoredScript[]>>(
              scriptsQueryKey(workspaceSlug),
              (oldData) => {
                if (!oldData?.data) return oldData;
                return {
                  ...oldData,
                  data: oldData.data.map((s) =>
                    s.id === updatedScript.id ? updatedScript : s
                  ),
                };
              }
            );

            // Update individual script cache if it exists
            queryClient.setQueryData<IrminAPIResponse<StoredScript>>(
              scriptsQueryKey(workspaceSlug, script.id),
              (oldData) => {
                if (!oldData) return oldData;
                return {
                  ...oldData,
                  data: updatedScript,
                };
              }
            );

            // Refresh the script in the tab if it's open
            const tabIndex = openTabs.findIndex(
              (tab) => tab.scriptId === script.id
            );
            if (tabIndex !== -1) {
              setOpenTabs((prev) =>
                prev.map((tab) =>
                  tab.scriptId === script.id
                    ? { ...tab, name: updatedScript.name }
                    : tab
                )
              );
            }

            // Invalidate queries to ensure consistency
            await queryClient.invalidateQueries({
              queryKey: scriptsQueryKey(workspaceSlug),
            });
          }}
        />
      );
    },
    [
      dict.scripts,
      irminModal,
      openTabs,
      queryClient,
      workspaceSlug,
      updateScriptMutation,
      transferScriptMutation,
      usersQuery,
    ]
  );

  /**
   * Deletes a script with confirmation.
   *
   * @param scriptId - The ID of the script to delete.
   * @returns Promise that resolves to true if deletion succeeded, false otherwise.
   */
  const deleteScript = useCallback(
    async (scriptId: string): Promise<boolean> => {
      try {
        await deleteScriptMutation.mutateAsync(scriptId);

        // Close the tab if the script is open
        const tabToClose = openTabs.find((tab) => tab.scriptId === scriptId);
        if (tabToClose) {
          closeTab(tabToClose.id);
        }

        irminAlert('success', dict.common.deleted);
        return true;
      } catch (error) {
        console.error('Error deleting script:', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to delete script'
        );
        return false;
      }
    },
    [deleteScriptMutation, openTabs, closeTab, irminAlert, dict.common]
  );

  /**
   * Executes a script in the Compute Sandbox.
   *
   * @param scriptId - The ID of the script to execute.
   */
  const [scriptExecutionResult, setScriptExecutionResult] =
    useState<ScriptResult | null>(null);

  const executeScript = useCallback(
    async (scriptId: string) => {
      if (!scriptId) return;
      irminAlert('info', dict.scripts.scriptExecutionStarted);

      try {
        const res = await executeScriptMutation.mutateAsync({
          scriptId,
          inputs: scriptInputFiles,
        });
        setScriptExecutionResult(res.data ?? null);
      } catch (error) {
        console.error('Error executing script:', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to execute script'
        );
      }
    },
    [dict.scripts, irminAlert, executeScriptMutation, scriptInputFiles]
  );

  const loading =
    scriptsQuery.isPending ||
    createScriptMutation.isPending ||
    updateScriptMutation.isPending ||
    deleteScriptMutation.isPending;

  return (
    <ScriptEditorContext.Provider
      value={{
        scripts: scriptsQuery.data?.data ?? [],
        scriptsError: scriptsQuery.error ?? null,
        refetchScripts: () => {
          void scriptsQuery.refetch();
        },
        loading,
        // Editor Tabs and Contents
        openTabs,
        activeTab: activeTabIndex,
        editorHeight,
        currentTab,
        enableSaveButton,
        // State Setters
        setActiveTab: setActiveTabIndex,
        setEditorHeight,
        // Editor Actions
        openNewTab,
        openScript,
        closeTab,
        updateCurrentTabContent,
        saveCurrentTab,
        changeLanguage,
        // Script Actions
        updateScriptMetadata,
        deleteScript,
        // Script Execution
        scriptExecutionInProgress: executeScriptMutation.isPending,
        scriptExecutionResult,
        executeScript,
        // Script Input Files
        scriptInputFiles,
        setScriptInputFiles,
      }}
    >
      {children}
    </ScriptEditorContext.Provider>
  );
};

export const useScriptEditor = () => {
  const context = useContext(ScriptEditorContext);
  if (!context) {
    throw new Error(
      'useScriptEditor must be used within a ScriptEditorProvider'
    );
  }
  return context;
};
