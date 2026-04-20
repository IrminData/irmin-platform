'use client';

import { Suspense, useCallback, useMemo, useState } from 'react';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { AiOutlinePlayCircle } from 'react-icons/ai';
import {
  TbBookmark,
  TbChevronUp,
  TbDownload,
  TbFileDiff,
  TbLink,
  TbRefresh,
  TbUpload,
} from 'react-icons/tb';

import CreateSavedQueryModal from '@/components/query/CreateQueryModal';
import SqlHelper from '@/components/query/helper/SqlHelper';
import QueryResults from '@/components/query/QueryResults';
import CodeMirrorEditor from '@/components/scripts/ide/CodeMirrorEditor';
import { Button } from '@/components/ui/button';
import { ButtonWithTooltip } from '@/components/ui/button-with-tooltip';
import DisplayTitle from '@/components/ui/display-title';
import { LocalizedErrorDisplay } from '@/components/ui/error/CommonErrorDisplay';
import { QueryError } from '@/components/ui/error/QueryError';
import SafeComponent from '@/components/ui/error/SafeComponent';
import PageSkeleton from '@/components/ui/loading/PageSkeleton';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useStoredQuery } from '@/context/QueryContext';
import { useRepositoryContext } from '@/context/RepositoryContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import {
  useRepositories,
  useRepositoryObject,
  useRepositoryObjectContent,
  useStoredQueries,
} from '@/hooks/api';
import { useBaseUrl, useResourceAllowed } from '@/hooks/utils';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { RepositoryObject } from '@/types/core/RepositoryObject';
import type { Tag } from '@/types/core/Tag';

import CreatePointerModal from './objects/CreatePointerModal';
import ObjectDetails from './objects/ObjectDetails';
import ObjectList from './objects/ObjectList';
import { FileUploadManager } from './objects/upload';

/**
 * Repository viewer section, provides UI for the Repository viewer Page.
 *
 * @param props - The component props
 * @param props.initialSelectedObject - The initial selected object to display
 * @returns The repository section component
 */
export default function RepositorySection({
  initialSelectedObject,
}: {
  initialSelectedObject?: RepositoryObject;
}) {
  return (
    <SafeComponent
      level='section'
      titleKey='repositoryTitle'
      descriptionKey='repositoryDescription'
    >
      <Suspense>
        <RepositorySectionContent
          initialSelectedObject={initialSelectedObject}
        />
      </Suspense>
    </SafeComponent>
  );
}

function RepositorySectionContent({
  initialSelectedObject,
}: {
  initialSelectedObject?: RepositoryObject;
}) {
  const { irminModal } = usePopup();
  const { dict } = useLocale();
  const { isResourceAllowed } = useResourceAllowed();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { workspaceSlug } = useWorkspaceContext();

  const { immutable, currentRef, repository } = useRepositoryContext();

  const [currentDirectoryPath, setCurrentDirectoryPath] = useState<string>('');

  const {
    executeSql,
    loading: queryLoading,
    result: queryResult,
  } = useStoredQuery();
  const [queryResultsOpen, setQueryResultsOpen] = useState(false);

  const { createStoredQueryMutation } = useStoredQueries();
  const { repositoriesQuery } = useRepositories();

  // Initialize selected object from search params if present
  const currentObjectPath = searchParams.get('object');

  const { repositoryObjectQuery, createPointerMutation } = useRepositoryObject(
    repository.slug,
    currentRef,
    '' // Always fetch root object of the repository
  );

  // Effect to sync selected object from URL params (for initial load or back/forward navigation)
  // We need to find the object in the fetched data that matches the path
  const objectFromParams = useMemo(() => {
    if (!currentObjectPath || !repositoryObjectQuery.data) return undefined;

    // Extract the root object from the API response
    const rootObject = (
      repositoryObjectQuery.data as IrminAPIResponse<RepositoryObject>
    ).data;
    if (!rootObject) return undefined;

    // Helper to find object recursively
    const findObject = (
      objects: RepositoryObject[],
      path: string
    ): RepositoryObject | undefined => {
      for (const obj of objects) {
        if (obj.path === path) return obj;
        if (obj.children) {
          const found = findObject(obj.children, path);
          if (found) return found;
        }
      }
      return undefined;
    };

    return findObject([rootObject], currentObjectPath);
  }, [currentObjectPath, repositoryObjectQuery.data]);

  // Derived selected object state
  const selectedObject = useMemo(() => {
    if (!currentObjectPath) return undefined;

    // Use loaded data if available
    if (objectFromParams) return objectFromParams;

    // Fallback to initial object if paths match (e.g. before data loads)
    if (
      initialSelectedObject &&
      initialSelectedObject.path === currentObjectPath
    ) {
      return initialSelectedObject;
    }

    return undefined;
  }, [currentObjectPath, objectFromParams, initialSelectedObject]);

  // Handle object selection and URL update
  const handleObjectSelection = useCallback(
    (object: RepositoryObject | undefined) => {
      // Update URL search params
      const newSearchParams = new URLSearchParams(searchParams.toString());
      if (object) {
        newSearchParams.set('object', object.path);
      } else {
        newSearchParams.delete('object');
      }
      router.push(`${pathname}?${newSearchParams.toString()}`);
    },
    [pathname, router, searchParams]
  );

  const { downloadObjectAsZipMutation } = useRepositoryObjectContent(
    repository.slug,
    currentRef,
    selectedObject?.path,
    true
  );

  const [customQuery, setCustomQuery] = useState<string | null>(null);

  const defaultQuery = useMemo(() => {
    if (!selectedObject || selectedObject.type !== 'structured') return '';
    return `SELECT * FROM $["${repository.slug};${selectedObject.path}${currentRef ? `@${currentRef}` : ''}"] LIMIT 10`;
  }, [repository.slug, selectedObject, currentRef]);

  const queryField = customQuery ?? defaultQuery;

  const canViewRepository = useMemo(
    () => isResourceAllowed('repository', 'read', repository.id),
    [isResourceAllowed, repository.id]
  );

  const canUpload = useMemo(
    () =>
      isResourceAllowed('repository_object', 'create', repository.id) &&
      isResourceAllowed('repository_object', 'update', repository.id),
    [isResourceAllowed, repository.id]
  );

  const canDownload = useMemo(
    () => isResourceAllowed('repository_object', 'read', repository.id),
    [isResourceAllowed, repository.id]
  );

  const canQuery = useMemo(
    () => isResourceAllowed('repository_object', 'read', repository.id),
    [isResourceAllowed, repository.id]
  );

  const handleUpload = useCallback(() => {
    irminModal.show(
      dict.repository.objects.uploadFiles.title,
      <FileUploadManager
        currentPath={currentDirectoryPath}
        currentRef={currentRef ?? repository.default_branch}
        repository={repository.slug}
        workspaceSlug={workspaceSlug}
        onComplete={() => irminModal.close()}
      />
    );
  }, [
    dict,
    irminModal,
    repository,
    currentRef,
    currentDirectoryPath,
    workspaceSlug,
  ]);

  const handleCreatePointer = useCallback(() => {
    irminModal.show(
      dict.repository.objects.createPointer,
      <CreatePointerModal
        currentRepository={repository.slug}
        currentPath={currentDirectoryPath}
        repositories={repositoriesQuery.data?.data ?? []}
        workspaceSlug={workspaceSlug}
        createPointer={async (
          pointerPath: string,
          targetRepository: string,
          targetPath: string,
          targetRef: string
        ) => {
          await createPointerMutation.mutateAsync({
            pointerPath,
            ref: currentRef ?? repository.default_branch,
            targetRepository,
            targetPath,
            targetRef,
          });
        }}
      />
    );
  }, [
    dict,
    irminModal,
    repository,
    currentRef,
    currentDirectoryPath,
    createPointerMutation,
    repositoriesQuery.data?.data,
    workspaceSlug,
  ]);

  const handleSaveQuery = useCallback(() => {
    if (!queryField || queryField.length < 3) return;
    irminModal.show(
      dict.query.newQuery,
      <CreateSavedQueryModal
        workspaceSlug={workspaceSlug}
        createQuery={async (
          queryName: string,
          queryDescription: string,
          tags?: Tag[]
        ) => {
          const res = await createStoredQueryMutation.mutateAsync({
            name: queryName,
            description: queryDescription,
            sql: queryField,
            tags: tags?.map((tag) => tag.id),
          });
          if (!res.data) return;
          irminModal.close();
        }}
      />,
      () => irminModal.close()
    );
  }, [dict, irminModal, queryField, createStoredQueryMutation, workspaceSlug]);

  const runCurrentQuery = useCallback(() => {
    if (!queryField || queryField.length < 3) return;
    executeSql(queryField);
    setQueryResultsOpen(true);
  }, [queryField, executeSql]);

  /** The base URL for the repository, eg. /en/workspace/workspace-slug/repositories/repository-slug */
  const baseUrl = useBaseUrl({
    pathname: '',
    segment: 'repositories',
    includeSegment: true,
    segmentsAfter: 1,
  });

  // The base URL for the workspace, eg. /en/workspace/workspace-slug
  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'workspace',
    includeSegment: true,
    segmentsAfter: 1,
  });

  const updateQuery = useCallback(
    (value: string) => {
      if (queryLoading) return;
      setCustomQuery(value);
    },
    [queryLoading]
  );

  if (!canViewRepository) {
    return (
      <div className='relative container mx-auto max-w-7xl px-4 py-8'>
        <div className='my-4 flex flex-row items-center justify-between gap-4'>
          <DisplayTitle>{dict.repository.repository}</DisplayTitle>
        </div>
        <LocalizedErrorDisplay
          variant='section'
          title={dict.common.insufficientPermissions}
          description={dict.common.errors.noPermissionsToViewRepository}
          showReload={false}
          showDetails={false}
        />
      </div>
    );
  }

  // Handle loading state for repository object
  if (repositoryObjectQuery.isLoading) {
    return (
      <div
        className={`
          relative container mx-auto max-w-7xl px-2
          md:px-4
        `}
      >
        <PageSkeleton showHeader={true} contentRows={3} className='py-4' />
      </div>
    );
  }

  // Handle error state for repository object
  if (repositoryObjectQuery.error) {
    return (
      <div
        className={`
          relative container mx-auto max-w-7xl px-2
          md:px-4
        `}
      >
        <QueryError
          error={repositoryObjectQuery.error}
          onRetry={() => repositoryObjectQuery.refetch()}
          title={dict.common.errors.failedToLoadObjects}
          description={dict.common.errors.failedToLoadAgain}
          className='py-8'
        />
      </div>
    );
  }

  return (
    <>
      <div
        className={`
          relative container mx-auto mb-4 flex max-w-7xl flex-col px-2
          md:px-4
        `}
      >
        {canQuery && (
          <div
            className={`
              w-full max-w-full overflow-hidden rounded-md border
              border-gray-100 bg-background
              dark:border-gray-800
            `}
          >
            <div
              className={`
                flex w-full flex-row items-center justify-between bg-gray-100
                pl-4
                dark:bg-gray-800
              `}
            >
              <div
                className={`
                  flex flex-row items-center gap-2 py-2 text-sm font-semibold
                `}
              >
                {dict.repository.sqlQuery}
                <SqlHelper
                  currentSql={queryField}
                  repositoryObject={selectedObject}
                  selector={selectedObject?.sql_selector}
                  title={selectedObject?.name}
                />
              </div>
              <div className='flex flex-row items-center'>
                <Button
                  variant='gray'
                  className='float-end m-1 shadow-none'
                  size='sm'
                  icon={<TbBookmark />}
                  disabled={!queryField || queryField.length < 3}
                  onClick={handleSaveQuery}
                >
                  {dict.query.saveQuery}
                </Button>
                <Button
                  variant='accent'
                  className='float-end m-1 shadow-none'
                  size='sm'
                  icon={<AiOutlinePlayCircle />}
                  loading={queryLoading}
                  onClick={runCurrentQuery}
                >
                  {dict.repository.runQuery}
                </Button>
              </div>
            </div>
            <CodeMirrorEditor
              language='sql'
              content={queryField}
              updateEditorContent={updateQuery}
            />
          </div>
        )}
        {!queryResultsOpen ? (
          <>
            <div
              className={`
                my-4 flex w-full flex-wrap items-center justify-between gap-4
              `}
            >
              <div
                className={`
                  inline max-w-full overflow-x-scroll text-xs whitespace-nowrap
                  text-gray-600
                  lg:text-sm
                  dark:text-gray-400
                `}
              >
                <Link
                  className={`
                    transition-colors
                    hover:text-gray-800 hover:underline
                    dark:hover:text-gray-200
                  `}
                  href={`${workspaceUrl}/repositories`}
                >
                  {workspaceSlug}
                </Link>
                {' / '}
                <Link
                  className={`
                    transition-colors
                    hover:text-gray-800 hover:underline
                    dark:hover:text-gray-200
                  `}
                  href={`${workspaceUrl}/repositories/${repository.slug}`}
                >
                  {repository.slug}
                </Link>
                {currentRef && ` @ ${currentRef}`}
              </div>
              <div className='flex items-center gap-2'>
                <ButtonWithTooltip
                  variant='secondary'
                  size='icon'
                  icon={<TbRefresh />}
                  tooltip={dict.common.refresh}
                  disabled={repositoryObjectQuery.isLoading}
                  onClick={() => repositoryObjectQuery.refetch()}
                  aria-label={dict.common.refresh}
                />
                {!immutable && (
                  <Button
                    variant='secondary'
                    size='sm'
                    href={`${baseUrl}/uncommitted-changes?${searchParams.toString()}`}
                    icon={<TbFileDiff />}
                  >
                    {dict.repository.commit.uncommittedChanges}
                  </Button>
                )}
                {canDownload && (
                  <Button
                    variant='secondary'
                    size='sm'
                    icon={<TbDownload />}
                    onClick={() => {
                      downloadObjectAsZipMutation.mutate({
                        path: currentDirectoryPath,
                        ref: currentRef ?? '',
                      });
                    }}
                    loading={downloadObjectAsZipMutation.isPending}
                  >
                    {dict.common.download}
                  </Button>
                )}
                {!immutable && canUpload && (
                  <>
                    <Button
                      variant='secondary'
                      size='sm'
                      onClick={handleCreatePointer}
                      icon={<TbLink />}
                    >
                      {dict.repository.objects.createPointer}
                    </Button>
                    <Button
                      variant='accent'
                      size='sm'
                      onClick={handleUpload}
                      icon={<TbUpload />}
                    >
                      {dict.repository.objects.uploadObject}
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div
              className={`
                flex w-full flex-col items-start gap-2
                md:flex-row md:gap-2
              `}
            >
              <ObjectList
                selectObject={handleObjectSelection}
                currentPath={currentDirectoryPath}
                setCurrentPath={setCurrentDirectoryPath}
                repositoryObjectQuery={repositoryObjectQuery}
              />
              <ObjectDetails
                selectedObject={selectedObject}
                closeDetails={() => handleObjectSelection(undefined)}
                setCurrentPath={setCurrentDirectoryPath}
              />
            </div>
          </>
        ) : (
          <div className='mt-4'>
            <Button
              variant='gray'
              size='sm'
              className='w-full text-pretty capitalize'
              onClick={() => setQueryResultsOpen(false)}
              icon={<TbChevronUp size={22} />}
            >
              {dict.common.close} {dict.query.queryResults}
            </Button>
          </div>
        )}
      </div>
      {queryResult && queryResultsOpen && (
        <div className='flex h-[calc(100vh-400px)] min-h-96'>
          <QueryResults
            title={dict.query.queryResults}
            result={queryResult}
            loading={queryLoading}
          />
        </div>
      )}
    </>
  );
}
