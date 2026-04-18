'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { TbDatabase, TbPlus, TbTrash } from 'react-icons/tb';

import RepositoryPathSelector from '@/components/repository/objects/RepositoryPathSelector';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useAIApplicationContext } from '@/context/AIApplicationContext';
import { useLocale } from '@/context/LocaleContext';

import { useAIApplication } from '@/hooks/api/useAIApplications';
import { useRepositories } from '@/hooks/api/useRepositories';
import { useRepositoryBranches } from '@/hooks/api/useRepositoryBranches';
import { useResourceAllowed } from '@/hooks/utils';

import type { AIApplicationDataSource } from '@/types/core/AIApplication';

/** Data source with a unique ID for stable React keys */
interface DataSourceWithId extends AIApplicationDataSource {
  _id: string;
}

/** Generate a unique ID for a data source */
const generateId = () =>
  `ds-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

/** Add IDs to data sources */
const withIds = (sources: AIApplicationDataSource[]): DataSourceWithId[] =>
  sources.map((ds) => ({ ...ds, _id: generateId() }));

/** Strip IDs from data sources for API calls */
const stripIds = (sources: DataSourceWithId[]): AIApplicationDataSource[] =>
  sources.map(({ _id: _, ...ds }) => ds);

interface DataSourceRowProps {
  dataSource: AIApplicationDataSource;
  index: number;
  onUpdate: (index: number, dataSource: AIApplicationDataSource) => void;
  onRemove: (index: number) => void;
  disabled?: boolean;
}

/**
 * Single data source row component
 */
const DataSourceRow = ({
  dataSource,
  index,
  onUpdate,
  onRemove,
  disabled,
}: DataSourceRowProps) => {
  const { dict } = useLocale();
  const { repositoriesQuery } = useRepositories();
  const { repositoryBranchesQuery } = useRepositoryBranches(
    dataSource.repository || ''
  );

  const [localDataSource, setLocalDataSource] =
    useState<AIApplicationDataSource>(dataSource);
  const [prevDataSource, setPrevDataSource] =
    useState<AIApplicationDataSource>(dataSource);
  // Sync local state with prop changes during render to avoid set-state-in-effect cascades
  if (dataSource !== prevDataSource) {
    setPrevDataSource(dataSource);
    setLocalDataSource(dataSource);
  }

  // Debounce path changes
  const [debouncedBranch, setDebouncedBranch] = useState(
    localDataSource.branch
  );
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedBranch(localDataSource.branch);
    }, 500);
    return () => clearTimeout(timer);
  }, [localDataSource.branch]);

  const handleRepositoryChange = useCallback(
    (repository: string) => {
      // Find the repository to get its default branch
      const repo = repositoriesQuery.data?.data?.find(
        (r) => r.slug === repository
      );
      const newDataSource = {
        ...localDataSource,
        repository,
        branch: repo?.default_branch || 'main',
        path: '',
      };
      setLocalDataSource(newDataSource);
      onUpdate(index, newDataSource);
    },
    [localDataSource, onUpdate, index, repositoriesQuery.data?.data]
  );

  const handleBranchChange = useCallback(
    (branch: string) => {
      const newDataSource = {
        ...localDataSource,
        branch,
      };
      setLocalDataSource(newDataSource);
      onUpdate(index, newDataSource);
    },
    [localDataSource, onUpdate, index]
  );

  const handlePathChange = useCallback(
    (path: string) => {
      const newDataSource = {
        ...localDataSource,
        path,
      };
      setLocalDataSource(newDataSource);
      onUpdate(index, newDataSource);
    },
    [localDataSource, onUpdate, index]
  );

  return (
    <div
      className={`
        rounded-lg border bg-background p-4
        dark:border-gray-700
      `}
    >
      <div className='mb-4 flex items-center justify-between'>
        <span className='text-sm font-medium text-muted-foreground'>
          {dict.aiApplication.dataSource} #{index + 1}
        </span>
        {!disabled && (
          <Button
            type='button'
            variant='ghost'
            size='icon'
            onClick={() => onRemove(index)}
            className={`
              size-8 text-destructive
              hover:text-destructive
            `}
            title={dict.common.remove}
            aria-label={dict.common.remove}
          >
            <TbTrash className='size-4' />
          </Button>
        )}
      </div>

      <div className='space-y-4'>
        {/* Repository Selection */}
        <div className='flex flex-col gap-2'>
          <Label htmlFor={`repository-${index}`}>
            {dict.repository.repository}
          </Label>
          <Select
            value={localDataSource.repository}
            onValueChange={handleRepositoryChange}
            disabled={disabled || repositoriesQuery.isLoading}
          >
            <SelectTrigger id={`repository-${index}`} className='w-full'>
              <SelectValue placeholder={dict.workflow.selectRepository}>
                {repositoriesQuery.data?.data?.find(
                  (r) => r.slug === localDataSource.repository
                )?.name || localDataSource.repository}
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
        </div>

        {/* Branch Selection */}
        <div className='flex flex-col gap-2'>
          <Label htmlFor={`branch-${index}`}>
            {dict.repository.branches.branch}
          </Label>
          {localDataSource.repository ? (
            <Select
              value={localDataSource.branch}
              onValueChange={handleBranchChange}
              disabled={disabled || repositoryBranchesQuery.isLoading}
            >
              <SelectTrigger id={`branch-${index}`} className='w-full'>
                <SelectValue
                  placeholder={dict.repository.branches.selectBranch}
                >
                  {localDataSource.branch}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {repositoryBranchesQuery.data?.data?.map((branch) => (
                  <SelectItem key={branch.name} value={branch.name}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id={`branch-${index}`}
              value={localDataSource.branch}
              onChange={(e) => handleBranchChange(e.target.value)}
              placeholder='main'
              disabled={disabled}
            />
          )}
        </div>

        {/* Path Selection */}
        <div className='flex flex-col gap-2'>
          <Label htmlFor={`path-${index}`}>
            {dict.repository.objects.path}
          </Label>
          {localDataSource.repository && debouncedBranch ? (
            <RepositoryPathSelector
              repositorySlug={localDataSource.repository}
              repositoryRef={debouncedBranch}
              defaultPath={localDataSource.path}
              onPathChange={handlePathChange}
              groupOnly
              defaultExpanded={false}
            />
          ) : (
            <Input
              id={`path-${index}`}
              value={localDataSource.path}
              onChange={(e) => handlePathChange(e.target.value)}
              placeholder='/'
              disabled={disabled || !localDataSource.repository}
            />
          )}
          <span className='text-xs text-muted-foreground'>
            {dict.aiApplication.dataSourcePathHint}
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * AI Application Data Sources Editor
 *
 * Allows users to add, edit, and remove data sources for an AI Application.
 * Each data source consists of a repository, branch, and path.
 */
const AIApplicationDataSourcesEditor = () => {
  const { dict } = useLocale();
  const { aiApplication } = useAIApplicationContext();
  const { updateAIApplicationMutation } = useAIApplication(aiApplication.id);
  const { isResourceAllowed } = useResourceAllowed();

  const canEdit = isResourceAllowed(
    'ai_application',
    'update',
    aiApplication.id
  );

  // Create a stable key from server data to detect external changes
  const serverDataKey = useMemo(
    () => JSON.stringify(aiApplication.data_sources || []),
    [aiApplication.data_sources]
  );

  // Local editing state - reset when server data changes
  const [editState, setEditState] = useState(() => ({
    key: serverDataKey,
    dataSources: withIds(aiApplication.data_sources || []),
    hasChanges: false,
  }));

  // Reset local state when server data changes (key changes)
  const dataSources = useMemo(
    () =>
      editState.key === serverDataKey
        ? editState.dataSources
        : withIds(aiApplication.data_sources || []),
    [
      editState.key,
      editState.dataSources,
      serverDataKey,
      aiApplication.data_sources,
    ]
  );
  const hasChanges =
    editState.key === serverDataKey ? editState.hasChanges : false;

  const handleAddDataSource = useCallback(() => {
    setEditState((prev) => {
      const currentSources =
        prev.key === serverDataKey
          ? prev.dataSources
          : withIds(aiApplication.data_sources || []);
      return {
        key: serverDataKey,
        dataSources: [
          ...currentSources,
          { _id: generateId(), repository: '', branch: 'main', path: '' },
        ],
        hasChanges: true,
      };
    });
  }, [serverDataKey, aiApplication.data_sources]);

  const handleUpdateDataSource = useCallback(
    (index: number, dataSource: AIApplicationDataSource) => {
      setEditState((prev) => {
        const currentSources =
          prev.key === serverDataKey
            ? prev.dataSources
            : withIds(aiApplication.data_sources || []);

        // Guard against index out of bounds (can occur when server data changes)
        if (index < 0 || index >= currentSources.length) {
          // Server data changed and index is stale - keep current state
          return prev;
        }

        const newDataSources = [...currentSources];
        // Preserve the _id when updating
        newDataSources[index] = {
          ...dataSource,
          _id: currentSources[index]._id,
        };
        const hasChanged =
          JSON.stringify(stripIds(newDataSources)) !==
          JSON.stringify(aiApplication.data_sources || []);
        return {
          key: serverDataKey,
          dataSources: newDataSources,
          hasChanges: hasChanged,
        };
      });
    },
    [serverDataKey, aiApplication.data_sources]
  );

  const handleRemoveDataSource = useCallback(
    (index: number) => {
      setEditState((prev) => {
        const currentSources =
          prev.key === serverDataKey
            ? prev.dataSources
            : withIds(aiApplication.data_sources || []);

        // Guard against index out of bounds (can occur when server data changes)
        if (index < 0 || index >= currentSources.length) {
          // Server data changed and index is stale - keep current state
          return prev;
        }

        const newDataSources = currentSources.filter((_, i) => i !== index);
        const hasChanged =
          JSON.stringify(stripIds(newDataSources)) !==
          JSON.stringify(aiApplication.data_sources || []);
        return {
          key: serverDataKey,
          dataSources: newDataSources,
          hasChanges: hasChanged,
        };
      });
    },
    [serverDataKey, aiApplication.data_sources]
  );

  const handleSave = useCallback(async () => {
    const validDataSources = stripIds(
      dataSources.filter((ds) => ds.repository && ds.branch)
    );

    await updateAIApplicationMutation.mutateAsync({
      data_sources: validDataSources,
    });
  }, [dataSources, updateAIApplicationMutation]);

  const handleReset = useCallback(() => {
    setEditState({
      key: serverDataKey,
      dataSources: withIds(aiApplication.data_sources || []),
      hasChanges: false,
    });
  }, [aiApplication.data_sources, serverDataKey]);

  // Count valid data sources
  const validCount = dataSources.filter(
    (ds) => ds.repository && ds.branch
  ).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2 capitalize'>
          <TbDatabase size={20} />
          {dict.aiApplication.dataSources}
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <p className='text-sm text-muted-foreground'>
          {dict.aiApplication.dataSourcesDescription}
        </p>

        {dataSources.length === 0 ? (
          <div
            className={`
              rounded-lg border-2 border-dashed p-6 text-center
              dark:border-gray-700
            `}
          >
            <TbDatabase className='mx-auto mb-2 size-8 text-muted-foreground' />
            <p className='mb-4 text-sm text-muted-foreground'>
              {dict.aiApplication.noDataSourcesConfigured}
            </p>
            {canEdit && (
              <Button
                type='button'
                variant='outline'
                onClick={handleAddDataSource}
              >
                <TbPlus className='mr-2 size-4' />
                {dict.common.add} {dict.aiApplication.dataSource}
              </Button>
            )}
          </div>
        ) : (
          <div className='space-y-4'>
            {dataSources.map((dataSource, index) => (
              <DataSourceRow
                key={dataSource._id}
                dataSource={dataSource}
                index={index}
                onUpdate={handleUpdateDataSource}
                onRemove={handleRemoveDataSource}
                disabled={!canEdit}
              />
            ))}

            {canEdit && (
              <Button
                type='button'
                variant='outline'
                onClick={handleAddDataSource}
                className='w-full'
              >
                <TbPlus className='mr-2 size-4' />
                {dict.common.add} {dict.aiApplication.dataSource}
              </Button>
            )}
          </div>
        )}

        {/* Save/Reset buttons */}
        {canEdit && hasChanges && (
          <div
            className={`
              flex items-center justify-between gap-4 border-t pt-4
              dark:border-gray-700
            `}
          >
            <span className='text-sm text-muted-foreground capitalize'>
              {validCount}{' '}
              {validCount === 1
                ? dict.aiApplication.dataSource
                : dict.aiApplication.dataSources}
            </span>
            <div className='flex gap-2'>
              <Button
                type='button'
                variant='outline'
                onClick={handleReset}
                disabled={updateAIApplicationMutation.isPending}
              >
                {dict.common.resetForm}
              </Button>
              <Button
                type='button'
                variant='gradient'
                onClick={handleSave}
                disabled={updateAIApplicationMutation.isPending}
              >
                {updateAIApplicationMutation.isPending
                  ? dict.common.loading
                  : dict.common.save}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIApplicationDataSourcesEditor;
