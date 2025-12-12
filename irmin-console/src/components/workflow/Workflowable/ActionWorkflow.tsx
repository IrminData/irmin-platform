'use client';

import { useCallback, useEffect, useRef } from 'react';

import InlineQueryEditor from '@/components/query/InlineQueryEditor';
import RepositoryPathSelector from '@/components/repository/objects/RepositoryPathSelector';
import InlineScriptEditor from '@/components/scripts/InlineScriptEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ActionInputEditor from '@/components/workflow/ActionInputEditor';

import { useLocale } from '@/context/LocaleContext';

import { useRepositories } from '@/hooks/api';
import { useBaseUrl } from '@/hooks/utils';

import type { Action, ActionInputData } from '@/types/core/Workflow';
import type { WorkflowRequest } from '@/types/internal/WorkflowInput';

interface ActionWorkflowProps {
  workflowable: Action;
  setWorkflowData: React.Dispatch<React.SetStateAction<WorkflowRequest>>;
}

export default function ActionWorkflow({
  workflowable,
  setWorkflowData,
}: ActionWorkflowProps) {
  const { dict } = useLocale();

  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'workspace',
    includeSegment: true,
    segmentsAfter: 1,
  });
  const { repositoriesQuery } = useRepositories();

  const handleInputFilesChange = useCallback(
    (inputFiles: ActionInputData[]) => {
      setWorkflowData((prev) => ({
        ...prev,
        workflowable: {
          ...(prev.workflowable as Action),
          input: inputFiles,
        },
      }));
    },
    [setWorkflowData]
  );

  // Use ref to store the latest setWorkflowData to avoid dependency issues
  const setWorkflowDataRef = useRef(setWorkflowData);
  useEffect(() => {
    setWorkflowDataRef.current = setWorkflowData;
  }, [setWorkflowData]);

  const handleScriptIdChange = useCallback((scriptId: string) => {
    setWorkflowDataRef.current((prev) => {
      const currentScriptId = (prev.workflowable as Action).script_id || '';
      const newScriptId = scriptId || '';

      // Prevent unnecessary updates if the value hasn't actually changed
      if (currentScriptId === newScriptId) {
        return prev;
      }

      return {
        ...prev,
        workflowable: {
          ...(prev.workflowable as Action),
          script_id: newScriptId,
        },
      };
    });
  }, []);

  const handleQueryIdChange = useCallback((queryId: string) => {
    setWorkflowDataRef.current((prev) => {
      const currentQueryId = (prev.workflowable as Action).query_id || '';
      const newQueryId = queryId || '';

      // Prevent unnecessary updates if the value hasn't actually changed
      if (currentQueryId === newQueryId) {
        return prev;
      }

      return {
        ...prev,
        workflowable: {
          ...(prev.workflowable as Action),
          query_id: newQueryId,
        },
      };
    });
  }, []);

  const handleExecutableTypeChange = useCallback((value: string) => {
    setWorkflowDataRef.current((prev) => {
      const currentAction = prev.workflowable as Action;
      const currentExecutableType = currentAction.executable_type || 'script';

      // Prevent unnecessary updates if the value hasn't actually changed
      if (currentExecutableType === value) {
        return prev;
      }

      if (value === 'script') {
        return {
          ...prev,
          workflowable: {
            ...currentAction,
            executable_type: 'script',
            script_id: currentAction.script_id,
            query_id: undefined,
          },
        };
      } else if (value === 'query') {
        return {
          ...prev,
          workflowable: {
            ...currentAction,
            executable_type: 'query',
            script_id: undefined,
            query_id: currentAction.query_id,
          },
        };
      }
      return prev;
    });
  }, []);

  return (
    <>
      <div className='flex flex-col gap-2'>
        <Label>{dict.workflow.executableType}</Label>
        <Select
          value={workflowable.executable_type || 'script'}
          onValueChange={handleExecutableTypeChange}
        >
          <SelectTrigger className='w-full'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='script'>{dict.scripts.script}</SelectItem>
            <SelectItem value='query'>{dict.query.query}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {(!workflowable.executable_type ||
        workflowable.executable_type === 'script') && (
        <InlineScriptEditor
          currentScriptId={workflowable.script_id || null}
          onScriptIdChange={handleScriptIdChange}
        />
      )}
      {workflowable.executable_type === 'query' && (
        <InlineQueryEditor
          currentQueryId={workflowable.query_id || null}
          onQueryIdChange={handleQueryIdChange}
        />
      )}
      <div className='flex flex-col gap-2'>
        <Label>{dict.workflow.scriptResultDestinationRepository}</Label>
        <Select
          value={workflowable.results_repository}
          onValueChange={(value) => {
            if (!value) return;
            setWorkflowData((prev) => ({
              ...prev,
              workflowable: {
                ...(prev.workflowable as Action),
                results_repository: value,
                results_repository_branch:
                  repositoriesQuery.data?.data?.find(
                    (repo) => repo.slug === value
                  )?.default_branch ??
                  workflowable.results_repository_branch ??
                  '',
              },
            }));
          }}
          disabled={repositoriesQuery.isLoading}
        >
          <SelectTrigger className='w-full'>
            <SelectValue>
              {repositoriesQuery.data?.data?.find(
                (repo) => workflowable.results_repository === repo.slug
              )?.name ?? workflowable.results_repository}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {repositoriesQuery.data?.data?.map((repo) => (
              <SelectItem key={repo.slug} value={repo.slug}>
                {repo.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {workflowable.results_repository && (
          <Button
            href={`${workspaceUrl}/repositories/${workflowable.results_repository}?ref=${workflowable.results_repository_branch}`}
            target='_blank'
            variant='secondary'
            className='w-full'
          >
            {dict.list.view}
          </Button>
        )}
        <Button
          href={`${workspaceUrl}/repositories?create`}
          target='_blank'
          variant='gray'
          className='w-full'
        >
          {dict.consoleNavigation.staticSearchItems.createRepository}
        </Button>
      </div>
      <div className='flex flex-col gap-2'>
        <Label>{dict.workflow.scriptResultDestinationBranch}</Label>
        <Input
          required
          type='text'
          defaultValue={workflowable.results_repository_branch ?? ''}
          onChange={(e) =>
            setWorkflowData((prev) => ({
              ...prev,
              workflowable: {
                ...(prev.workflowable as Action),
                results_repository_branch: e.target.value,
              },
            }))
          }
        />
      </div>
      {workflowable.results_repository &&
        workflowable.results_repository_branch && (
          <div className='flex flex-col gap-2'>
            <Label>{dict.workflow.scriptResultDestinationPath}</Label>
            <RepositoryPathSelector
              repositorySlug={workflowable.results_repository!}
              repositoryRef={workflowable.results_repository_branch!}
              defaultPath={workflowable.results_repository_path}
              onPathChange={(path) =>
                setWorkflowData((prev) => ({
                  ...prev,
                  workflowable: {
                    ...(prev.workflowable as Action),
                    results_repository_path: path,
                  },
                }))
              }
              defaultExpanded={true}
            />
          </div>
        )}
      <div className='flex flex-col gap-2'>
        <ActionInputEditor
          initialData={workflowable.input ?? []}
          onChange={handleInputFilesChange}
          disableSaveButton={true}
        />
      </div>
    </>
  );
}
